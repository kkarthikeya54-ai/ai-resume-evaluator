import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const NVIDIA_API_KEY = defineSecret("NVIDIA_API_KEY");
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const MODEL = process.env.LLM_MODEL || "nvidia/llama-3.3-70b-instruct";
const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CONCURRENCY = 2;
const RATE_LIMIT_PER_SEC = 3;
const MAX_RETRIES = 4;
const MAX_PROMPT_CHARS = 200000;

let active = 0;
let queue = [];
let bucketTokens = RATE_LIMIT_PER_SEC;
let bucketLast = Date.now();

async function waitForToken() {
  while (true) {
    const now = Date.now();
    const elapsed = (now - bucketLast) / 1000;
    if (elapsed >= 1) {
      bucketLast = now;
      bucketTokens = Math.min(RATE_LIMIT_PER_SEC, bucketTokens + elapsed * RATE_LIMIT_PER_SEC);
    }
    if (bucketTokens >= 1) {
      bucketTokens -= 1;
      return;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function acquireSlot() {
  while (active >= MAX_CONCURRENCY) {
    await new Promise((r) => setTimeout(r, 200));
  }
  active += 1;
}

function releaseSlot() {
  active -= 1;
  const next = queue.shift();
  if (next) next();
}

function enqueue(fn) {
  return new Promise((resolve) => {
    queue.push(() => resolve(fn()));
  });
}

async function runSerialized(fn) {
  const execute = async () => {
    await acquireSlot();
    try {
      return await fn();
    } finally {
      releaseSlot();
    }
  };
  return enqueue(execute);
}

function shortHash(input) {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

function backoffFor(attempt) {
  const base = 1000 * Math.pow(2, attempt);
  const jitter = Math.random() * base * 0.5;
  return base + jitter;
}

function corsHeaders(origin) {
  const allowListed =
    ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin);
  const headers = { "Vary": "Origin" };
  // Only echo the origin back when it is allow-listed. Sending no ACAO header
  // makes the browser reject the response; sending the literal string "null"
  // would break every browser client.
  if (allowListed && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    // Authorization + Content-Type both trigger preflight, and PUT/PATCH are
    // non-simple methods — all must be explicitly allowed.
    headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

async function callNvidia(apiKey, prompt) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(`${NVIDIA_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          top_p: 0.95,
          max_tokens: 8192,
          stream: false,
        }),
      });

      if (resp.status === 429 || resp.status >= 500) {
        const retryAfter = resp.headers.get("Retry-After");
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : backoffFor(attempt);
        console.warn(`NVIDIA ${resp.status}, retry in ${waitMs}ms (attempt ${attempt + 1})`);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
      }

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => "");
        throw new Error(`NVIDIA ${resp.status}: ${errBody.slice(0, 500)}`);
      }

      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new Error("NVIDIA returned empty response.");
      }
      return text;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        const waitMs = backoffFor(attempt);
        console.warn(`NVIDIA call failed, retry in ${waitMs}ms: ${err.message}`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }
  throw lastError;
}

export const analyzeResume = onRequest(
  { cors: true, secrets: [NVIDIA_API_KEY], region: "us-central1", timeoutSeconds: 300, memory: "512MiB" },
  async (req, res) => {
    res.set(corsHeaders(req.headers.origin || ""));

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed." });
      return;
    }

    const { prompt, json } = req.body || {};
    if (typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({ error: "A prompt is required." });
      return;
    }

    if (prompt.length > MAX_PROMPT_CHARS) {
      res.status(413).json({ error: "Payload too large." });
      return;
    }

    const cacheKey = `r_${shortHash(prompt)}`;

    try {
      const cached = await db.collection("analyses").doc(cacheKey).get();
      if (cached.exists) {
        const data = cached.data();
        if (data?.createdAt && Date.now() - Number(data.createdAt) < CACHE_TTL_MS) {
          res.json({ result: data.result, cached: true });
          return;
        }
      }
    } catch (err) {
      console.warn("Cache read failed:", err.message);
    }

    try {
      const apiKey = NVIDIA_API_KEY.value();
      const text = await runSerialized(async () => {
        await waitForToken();
        return callNvidia(apiKey, prompt);
      });

      let parsed;
      if (json === false) {
        parsed = text;
      } else {
        try {
          parsed = JSON.parse(text);
        } catch {
          const start = text.indexOf("{");
          const end = text.lastIndexOf("}");
          if (start === -1 || end === -1 || end <= start) {
            throw new Error("Model returned invalid JSON.");
          }
          parsed = JSON.parse(text.slice(start, end + 1));
        }
      }

      try {
        await db.collection("analyses").doc(cacheKey).set({
          result: parsed,
          createdAt: Date.now(),
        });
      } catch (err) {
        console.warn("Cache write failed:", err.message);
      }

      res.json({ result: parsed, cached: false });
    } catch (err) {
      console.error("LLM proxy error:", err);
      const status = /rate limit|quota|RESOURCE_EXHAUSTED|429/i.test(err?.message || "")
        ? 429
        : 502;
      res.status(status).json({ error: "Analysis service failed. Please try again." });
    }
  }
);

const HR_SESSIONS = "hr_sessions";
const CANDIDATE_STATUSES = new Set(["screened", "shortlisted", "interviewing", "hired"]);
const DEFAULT_STATUS = "screened";

function jsonBody(headers, body) {
  if (headers["content-type"]?.includes("application/json")) return typeof body === "object" ? body : {};
  return {};
}

async function verifyUser(req) {
  const auth = getAuth();
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (!token) return null;
  try {
    return await auth.verifyIdToken(token);
  } catch {
    return null;
  }
}

function replyCors(res, origin) {
  res.set(corsHeaders(origin));
}

export const saveHrSession = onRequest(
  { cors: true, region: "us-central1", memory: "512MiB" },
  async (req, res) => {
    replyCors(res, req.headers.origin || "");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    if (req.method !== "PUT" && req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed." });
      return;
    }

    const claims = await verifyUser(req);
    if (!claims) {
      res.status(401).json({ error: "Unauthorized. Provide a valid Firebase ID token." });
      return;
    }

    const sessionId = String(req.params.id || "");
    if (!sessionId) {
      res.status(400).json({ error: "A session id is required." });
      return;
    }

    const body = jsonBody(req.headers, req.body);
    const payload = body.payload;
    if (!payload || typeof payload !== "object") {
      res.status(400).json({ error: "A session payload is required." });
      return;
    }

    try {
      const ref = db.collection(HR_SESSIONS).doc(sessionId);
      const existing = await ref.get();
      if (existing.exists && existing.data()?.uid !== claims.uid) {
        res.status(403).json({ error: "You do not own this session." });
        return;
      }

      const candidates = Array.isArray(payload.candidates)
        ? payload.candidates.map((c) => ({
            ...c,
            status: CANDIDATE_STATUSES.has(c.status) ? c.status : DEFAULT_STATUS,
          }))
        : [];

      await ref.set(
        {
          uid: claims.uid,
          role: body.role || "hr",
          name: String(body.name || payload.name || sessionId),
          payload: { ...payload, candidates },
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: existing.exists ? null : FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      res.json({ ok: true, id: sessionId });
    } catch (err) {
      console.error("saveHrSession error:", err);
      res.status(500).json({ error: "Failed to save session." });
    }
  }
);

export const updateCandidateStatus = onRequest(
  { cors: true, region: "us-central1", memory: "256MiB" },
  async (req, res) => {
    replyCors(res, req.headers.origin || "");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    if (req.method !== "PATCH") {
      res.status(405).json({ error: "Method not allowed." });
      return;
    }

    const claims = await verifyUser(req);
    if (!claims) {
      res.status(401).json({ error: "Unauthorized. Provide a valid Firebase ID token." });
      return;
    }

    const sessionId = String(req.params.sessionId || "");
    const candidateId = String(req.params.candidateId || "");
    if (!sessionId || !candidateId) {
      res.status(400).json({ error: "Session id and candidate id are required." });
      return;
    }

    const body = jsonBody(req.headers, req.body);
    const status = String(body.status || "").toLowerCase();
    if (!CANDIDATE_STATUSES.has(status)) {
      res.status(400).json({ error: `status must be one of: ${[...CANDIDATE_STATUSES].join(", ")}` });
      return;
    }

    try {
      const ref = db.collection(HR_SESSIONS).doc(sessionId);
      const snap = await ref.get();
      if (!snap.exists) {
        res.status(404).json({ error: "Session not found." });
        return;
      }
      if (snap.data().uid !== claims.uid) {
        res.status(403).json({ error: "You do not own this session." });
        return;
      }

      const session = snap.data();
      const candidates = Array.isArray(session.payload?.candidates)
        ? session.payload.candidates.map((c) =>
            c.id === candidateId ? { ...c, status } : c
          )
        : [];

      await ref.update({
        payload: { ...session.payload, candidates },
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.json({ ok: true, status });
    } catch (err) {
      console.error("updateCandidateStatus error:", err);
      res.status(500).json({ error: "Failed to update candidate status." });
    }
  }
);

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export const exportHrSessionCsv = onRequest(
  { cors: true, region: "us-central1", memory: "256MiB" },
  async (req, res) => {
    replyCors(res, req.headers.origin || "");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed." });
      return;
    }

    const claims = await verifyUser(req);
    if (!claims) {
      res.status(401).json({ error: "Unauthorized. Provide a valid Firebase ID token." });
      return;
    }

    const sessionId = String(req.params.id || "");
    if (!sessionId) {
      res.status(400).json({ error: "A session id is required." });
      return;
    }

    try {
      const snap = await db.collection(HR_SESSIONS).doc(sessionId).get();
      if (!snap.exists) {
        res.status(404).json({ error: "Session not found." });
        return;
      }
      if (snap.data().uid !== claims.uid) {
        res.status(403).json({ error: "You do not own this session." });
        return;
      }

      const candidates = snap.data().payload?.candidates || [];
      const headers = [
        "Rank", "Candidate Name", "File", "Overall Match", "Skills", "Experience",
        "Education", "Projects", "Keyword Match", "Status",
      ];
      const rows = candidates.map((c) => [
        c.rank ?? "—",
        csvEscape(c.evaluation?.name || c.fileName || ""),
        csvEscape(c.fileName || ""),
        `${c.scores?.total ?? c.scores?.overall ?? 0}%`,
        `${c.scores?.skills ?? 0}%`,
        `${c.scores?.experience ?? 0}%`,
        `${c.scores?.education ?? 0}%`,
        `${c.scores?.projects ?? 0}%`,
        `${c.scores?.keywordMatch ?? 0}%`,
        c.status || DEFAULT_STATUS,
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      res.set("Content-Type", "text/csv; charset=utf-8");
      res.set("Content-Disposition", `attachment; filename="candidate-evaluation-results-${sessionId}.csv"`);
      res.status(200).send(csv);
    } catch (err) {
      console.error("exportHrSessionCsv error:", err);
      res.status(500).json({ error: "Failed to export session." });
    }
  }
);

export const deleteUserAccount = onRequest(
  { cors: true, region: "us-central1", memory: "256MiB" },
  async (req, res) => {
    replyCors(res, req.headers.origin || "");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed." });
      return;
    }

    const claims = await verifyUser(req);
    if (!claims) {
      res.status(401).json({ error: "Unauthorized. Provide a valid Firebase ID token." });
      return;
    }

    const uid = claims.uid;

    try {
      await db.collection("users").doc(uid).delete();
      const sessions = await db
        .collection(HR_SESSIONS)
        .where("uid", "==", uid)
        .get();
      await Promise.all(sessions.docs.map((d) => d.ref.delete()));

      // Best-effort: clear cached analyses is intentionally NOT performed here
      // (they are keyed by prompt hash and shared memory is desirable).

      await getAuth().deleteUser(uid).catch((err) => {
        console.warn("deleteUser failed (may be already removed):", err.message);
      });

      res.json({ ok: true });
    } catch (err) {
      console.error("deleteUserAccount error:", err);
      res.status(500).json({ error: "Failed to delete account." });
    }
  }
);
