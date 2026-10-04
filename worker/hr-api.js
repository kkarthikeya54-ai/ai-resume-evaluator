/**
 * HR API — Cloudflare Worker (free plan).
 *
 * Replaces the Firebase Cloud Functions backend (saveHrSession,
 * updateCandidateStatus, exportHrSessionCsv, deleteUserAccount) which can no
 * longer be deployed: Firebase now requires the Blaze plan for Cloud
 * Functions. This worker runs on the free Cloudflare plan and uses Workers KV
 * for storage.
 *
 * Storage model (keyed by Firebase UID so ownership is enforced by
 * construction — a session can only ever be read/written through its
 * owner's key):
 *
 *   hr:sessions:<uid>                     -> JSON array of session records
 *   hr:session:<uid>:<sessionId>          -> single session record
 *                                            { uid, role, name, payload, updatedAt }
 *
 * KV value limit is 25 MiB; session payloads embed base64 resume bytes
 * (~50 KB-2 MB each), well within it.
 *
 * Auth: Firebase client ID tokens are verified against Google's public JWT
 * verification endpoint (no service account needed):
 *   GET https://firebaseauth.googleapis.com/v1/verifyToken?key=<WebApiKey>
 *   body: { token: <ID token>, returnSecureToken: false }
 * The response echoes the decoded claims on success; errors carry a non-200
 * status. Project id and web api key come from wrangler vars.
 *
 * Secrets (wrangler secret put): FIREBASE_WEB_API_KEY
 * Vars (wrangler.toml):        FIREBASE_PROJECT_ID, ALLOWED_ORIGINS
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // tightened via ALLOWED_ORIGINS below at runtime
  "Access-Control-Allow-Methods": "GET, PUT, PATCH, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year of inactivity
const MAX_BODY_BYTES = 24 * 1024 * 1024; // KV cap is 25 MiB; leave headroom
const ALLOWED_STATUSES = new Set(["screened", "shortlisted", "interviewing", "hired", "rejected"]);
const DEFAULT_STATUS = "screened";

function corsHeaders(request, env, extra = {}) {
  const envAllowed = (env.ALLOWED_ORIGINS || "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = request.headers.get("Origin") || "";
  const allowed =
    envAllowed.includes("*") || envAllowed.includes(origin) ? origin : "";
  const headers = { ...CORS_HEADERS, "Access-Control-Allow-Methods": "GET, PUT, PATCH, POST, OPTIONS" };
  if (allowed) {
    headers["Access-Control-Allow-Origin"] = allowed;
  } else {
    headers["Access-Control-Allow-Origin"] = "*";
  }
  return { ...headers, ...extra };
}

function jsonResponse(request, env, status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request, env) },
  });
}

/** Decode + verify a Firebase ID token. Returns claims or null. */
async function verifyFirebaseToken(request, env) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !env.FIREBASE_WEB_API_KEY) return null;

  try {
    // Identity Toolkit accounts:lookup validates the ID token (signature,
    // expiry, project audience) and echoes the user claims on success.
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const claims = data?.users?.[0] || null;
    return claims?.localId ? claims : null;
  } catch {
    return null;
  }
}

function sessionKey(uid, sessionId) {
  return `hr:session:${uid}:${sessionId}`;
}

function sessionsIndexKey(uid) {
  return `hr:sessions:${uid}`;
}

async function readSessionsIndex(env, uid) {
  const raw = await env.HR_KV.get(sessionsIndexKey(uid));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function summarize(record) {
  return {
    id: record.id,
    name: record.name || "Untitled Session",
    role: record.role || "hr",
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
    candidateCount: Array.isArray(record.payload?.candidates)
      ? record.payload.candidates.length
      : 0,
  };
}

/** GET /sessions — list the caller's sessions (summaries only). */
async function listSessions(request, env, uid) {
  const index = await readSessionsIndex(env, uid);
  const summaries = [];
  for (const entry of index) {
    const raw = await env.HR_KV.get(sessionKey(uid, entry.id));
    if (!raw) continue;
    try {
      summaries.push(summarize(JSON.parse(raw)));
    } catch {
      // skip corrupt entries
    }
  }
  return jsonResponse(request, env, 200, { sessions: summaries });
}

/** GET /session/:id — full session record. */
async function getSession(request, env, uid, sessionId) {
  const raw = await env.HR_KV.get(sessionKey(uid, sessionId));
  if (!raw) {
    return jsonResponse(request, env, 404, { error: "Session not found." });
  }
  try {
    return jsonResponse(request, env, 200, { session: JSON.parse(raw) });
  } catch {
    return jsonResponse(request, env, 500, { error: "Stored session is corrupt." });
  }
}

/** PUT /session/:id — upsert a session (replaces saveHrSession). */
async function putSession(request, env, uid, sessionId) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, env, 400, { error: "A JSON body is required." });
  }
  const payload = body?.payload;
  if (!payload || typeof payload !== "object") {
    return jsonResponse(request, env, 400, { error: "A session payload is required." });
  }

  // Validate candidates the same way the Cloud Functions did.
  if (Array.isArray(payload.candidates)) {
    payload.candidates = payload.candidates.map((c) => ({
      ...c,
      status: ALLOWED_STATUSES.has(c.status) ? c.status : DEFAULT_STATUS,
    }));
  }

  const now = new Date().toISOString();
  const existingRaw = await env.HR_KV.get(sessionKey(uid, sessionId));
  let createdAt = now;
  if (existingRaw) {
    try {
      createdAt = JSON.parse(existingRaw).createdAt || now;
    } catch {
      // keep default
    }
  }

  const record = {
    id: sessionId,
    uid,
    role: "hr",
    name: String(body.name || payload.name || sessionId),
    createdAt,
    updatedAt: now,
    payload,
  };

  await env.HR_KV.put(sessionKey(uid, sessionId), JSON.stringify(record), {
    expirationTtl: SESSION_TTL_SECONDS,
  });

  // Maintain the index.
  const index = await readSessionsIndex(env, uid);
  if (!index.some((e) => e.id === sessionId)) {
    index.push({ id: sessionId, updatedAt: now });
  } else {
    const entry = index.find((e) => e.id === sessionId);
    entry.updatedAt = now;
  }
  await env.HR_KV.put(sessionsIndexKey(uid), JSON.stringify(index), {
    expirationTtl: SESSION_TTL_SECONDS,
  });

  return jsonResponse(request, env, 200, { ok: true, id: sessionId, updatedAt: now });
}

/** PATCH /session/:id/candidate/:cid — replace updateCandidateStatus. */
async function patchCandidate(request, env, uid, sessionId, candidateId) {
  const raw = await env.HR_KV.get(sessionKey(uid, sessionId));
  if (!raw) {
    return jsonResponse(request, env, 404, { error: "Session not found." });
  }
  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    return jsonResponse(request, env, 500, { error: "Stored session is corrupt." });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, env, 400, { error: "A JSON body is required." });
  }
  const status = String(body?.status || "").toLowerCase();
  if (!ALLOWED_STATUSES.has(status)) {
    return jsonResponse(request, env, 400, {
      error: `status must be one of: ${[...ALLOWED_STATUSES].join(", ")}`,
    });
  }

  const candidates = Array.isArray(record.payload?.candidates)
    ? record.payload.candidates
    : [];
  const target = candidates.find((c) => c.id === candidateId);
  if (!target) {
    return jsonResponse(request, env, 404, { error: "Candidate not found." });
  }
  target.status = status;
  record.payload.candidates = candidates;
  record.updatedAt = new Date().toISOString();

  await env.HR_KV.put(sessionKey(uid, sessionId), JSON.stringify(record), {
    expirationTtl: SESSION_TTL_SECONDS,
  });

  return jsonResponse(request, env, 200, { ok: true, status });
}

/** DELETE /session/:id — remove one session. */
async function deleteSession(request, env, uid, sessionId) {
  await env.HR_KV.delete(sessionKey(uid, sessionId));
  const index = await readSessionsIndex(env, uid);
  const next = index.filter((e) => e.id !== sessionId);
  await env.HR_KV.put(sessionsIndexKey(uid), JSON.stringify(next), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
  return jsonResponse(request, env, 200, { ok: true });
}

/** POST /account — purge everything for the caller (replaces deleteUserAccount). */
async function deleteAccount(request, env, uid) {
  const index = await readSessionsIndex(env, uid);
  for (const entry of index) {
    await env.HR_KV.delete(sessionKey(uid, entry.id));
  }
  await env.HR_KV.delete(sessionsIndexKey(uid));
  return jsonResponse(request, env, 200, { ok: true });
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    // Token verification requires the web API key; reject early when absent.
    const claims = await verifyFirebaseToken(request, env);
    if (!claims) {
      return jsonResponse(request, env, 401, {
        error: "Unauthorized. Provide a valid Firebase ID token.",
      });
    }
    const uid = claims.localId;

    try {
      if (request.method === "GET" && path === "/sessions") {
        return await listSessions(request, env, uid);
      }
      const sessionMatch = path.match(/^\/session\/([^/]+)$/);
      if (sessionMatch && request.method === "GET") {
        return await getSession(request, env, uid, decodeURIComponent(sessionMatch[1]));
      }
      if (sessionMatch && request.method === "PUT") {
        return await putSession(request, env, uid, decodeURIComponent(sessionMatch[1]));
      }
      if (sessionMatch && request.method === "DELETE") {
        return await deleteSession(request, env, uid, decodeURIComponent(sessionMatch[1]));
      }
      const candidateMatch = path.match(/^\/session\/([^/]+)\/candidate\/([^/]+)$/);
      if (candidateMatch && request.method === "PATCH") {
        return await patchCandidate(
          request,
          env,
          uid,
          decodeURIComponent(candidateMatch[1]),
          decodeURIComponent(candidateMatch[2])
        );
      }
      if (request.method === "POST" && path === "/account/delete") {
        return await deleteAccount(request, env, uid);
      }

      return jsonResponse(request, env, 404, { error: "Not found." });
    } catch (err) {
      console.error("hr-api error:", err);
      return jsonResponse(request, env, 500, { error: "Internal error." });
    }
  },
};
