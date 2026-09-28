import aiConfig, { hasAccess } from "../config/ai";

const CACHE_PREFIX = "airesume_cache_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_RETRIES = 4;
const RATE_LIMIT_RETRIES = 5;

function log(...args) {
  console.log("%c[AI]", "color:#0ea5e9;font-weight:bold", ...args);
}

function warn(...args) {
  console.warn("%c[AI]", "color:#f59e0b;font-weight:bold", ...args);
}

function err(...args) {
  console.error("%c[AI]", "color:#ef4444;font-weight:bold", ...args);
}


function buildPrompt(type, resumeText) {
  const base = `You are an expert career advisor and AI recruitment specialist. Analyze the following resume and return a JSON object. No markdown, no code fences, no explanation — only valid JSON.

Resume:
"""
${resumeText}
"""

`;

  const prompts = {
    parseResume: `${base}Return a JSON object extracting structured data from the resume:
- "name": string
- "email": string
- "phone": string
- "location": string
- "linkedin": string
- "summary": string
- "skills": array of strings
- "experience": array of objects with "company", "role", "duration", "highlights" (array of strings)
- "education": array of objects with "degree", "institution", "year"
- "projects": array of objects with "name", "description", "technologies" (array of strings)
- "certifications": array of strings
Use empty string or empty array when a field is missing.`,

    summary: `${base}Return a JSON object with a single key "summary" containing a concise professional summary (2-3 sentences) of the candidate based on their resume.`,

    readiness: `${base}Return a JSON object with:
- "score": a number from 0-100 representing placement readiness
- "breakdown": an object with keys "skills", "experience", "education", "projects". Each value is an object with a "score" (number 0-25), a "max" (number, always 25), and a "note" string
- "strengths": an array of strings
- "weaknesses": an array of strings`,

    skillGap: `${base}Return a JSON object with:
- "currentSkills": array of strings (skills found in resume)
- "inDemandSkills": array of strings (skills trending in the industry for this role)
- "gaps": array of strings (missing skills the candidate should learn)
- "analysis": a string with brief skill gap analysis`,

    targetRoles: `${base}Based ONLY on the actual skills, experience, education and projects in the resume, evaluate the candidate's match against several realistic target roles suited to their background (derive the roles from the resume's actual domain, e.g. for an engineering/CS profile use roles like Full-Stack, Frontend, Backend, AI/ML; for other domains use roles appropriate to that field).

Return a JSON object with a single key "roles" which is an array of 3-4 objects, each with:
- "id": string (url-safe slug)
- "title": string (role title)
- "icon": string (a single emoji)
- "score": number 0-100 indicating how well the candidate currently matches this role (base it strictly on the resume content)
- "strengths": array of 2-3 strings (skills the candidate already has that fit this role)
- "gaps": array of 2-3 strings (skills the candidate would need to acquire for this role)`,
    skillDomains: `${base}Based ONLY on the candidate's actual skills, categorize their technical competency into 4-5 domain areas that match their actual background (e.g. frontend, backend, databases, DSA, system design, or domain-appropriate areas for non-CS fields). Do not invent domains absent from the resume.

Return a JSON object with a single key "domains" which is an array of 4-5 objects, each with:
- "category": string (domain name)
- "score": number 0-100 (candidate's competency, derived strictly from resume evidence)
- "target": number 0-100 (typical industry baseline for that domain)
- "icon": string (a single emoji)
- "color": string (a Tailwind gradient class like "from-primary-500 to-accent-600")`,
    missingSkills: `${base}Return a JSON object with a single key "missingSkills" which is an array of objects, each with:
- "skill": string
- "importance": "high" | "medium" | "low"
- "reason": string explaining why this skill matters
- "resource": string (a suggested free resource to learn it)`,

    improvements: `${base}Return a JSON object with a single key "improvements" which is an array of objects, each with:
- "section": string (which resume section to improve)
- "issue": string (what's wrong)
- "suggestion": string (how to fix it)
- "priority": "high" | "medium" | "low"`,

    projects: `${base}Return a JSON object with a single key "recommendedProjects" which is an array of objects, each with:
- "title": string
- "description": string
- "technologies": array of strings
- "difficulty": "beginner" | "intermediate" | "advanced"
- "reason": string (why this project helps the candidate)`,

    certifications: `${base}Return a JSON object with a single key "recommendedCertifications" which is an array of objects, each with:
- "name": string
- "provider": string
- "description": string
- "relevance": string (why it's relevant to this candidate)
- "url": string`,

    roadmap: `${base}Return a JSON object with a single key "roadmap" which is an object with keys "30days", "60days", "90days". Each is an array of objects with:
- "week": string (e.g. "Week 1-2")
- "focus": string
- "actions": array of strings
- "expectedOutcome": string`,

    dsa: `${base}Return a JSON object with a single key "recommendations" which is an object with:
- "topics": array of objects each with "topic" (string), "importance" ("high"|"medium"|"low"), "reason" (string)
- "practicePlan": array of objects each with "week" (string), "topics" (array of strings), "problemsToSolve" (number)
- "resources": array of objects each with "name" (string), "type" (string), "url" (string)`,

    interviewQuestions: `${base}Return a JSON object with a single key "questions" which is an array of objects, each with:
- "category": string (e.g. "Technical", "Behavioral", "HR")
- "question": string
- "expectedAnswer": string
- "preparationTip": string`,

    expandKeywords: `You are an expert technical recruiter and NLP specialist. Expand the given job keywords into a broader, industry-accurate keyword set: keep every original keyword, then add close synonyms, related technologies, adjacent skills, and common alternate phrasings used in job postings for the same role. Do not add unrelated terms.

Input keywords:
"""
${resumeText}
"""

Return a JSON object with a single key "keywords": an array of unique lowercase strings (originals plus similar/related terms). Maximum 60 items.`,

    evaluateCandidate: `You are an expert technical recruiter evaluating a candidate for a job opening. A job opening is defined by JOB RULES and JOB KEYWORDS. Evaluate the candidate resume below against them and return ONLY valid JSON with this exact structure:
- "name": string (candidate name, or the file name if unknown)
- "email": string (or empty)
- "phone": string (or empty)
- "headline": string (current or desired role in 5-8 words)
- "skills": array of strings (top skills present in the resume)
- "matchedKeywords": array of strings (which job keywords appear or are clearly implied by the resume)
- "missingKeywords": array of strings (important required keywords NOT found in the resume, max 8)
- "sections": object with keys "experience", "education", "projects", "skills". Each value is an object: { "present": boolean, "quality": number 0-100, "note": string }
- "ratings": object with keys "skills", "experience", "education", "projects", "keywordMatch", "overall". Each value is a number 0-100.
- "strengths": array of 3-5 strings
- "concerns": array of 2-4 strings
- "rationale": string (2-3 sentences explaining the overall rating against the RULES and KEYWORDS)

Base every rating on the RULES and KEYWORDS. The "keywordMatch" rating must reflect keyword coverage in the resume.

${resumeText}`,

    evaluateBatch: `You are an expert technical recruiter evaluating a batch of candidates for one job opening. A job opening is defined by JOB RULES and JOB KEYWORDS. Evaluate EVERY candidate in the batch independently and thoroughly against the RULES and KEYWORDS. Do not average, merge, or reuse strengths across candidates. Return ONLY valid JSON, no markdown.

The response must be a JSON object where each key is a candidate number ("0", "1", ...) matching the "CANDIDATE <number>" blocks in the input, and each value is an evaluation object with this exact structure:
- "name": string (candidate name, or the file name if unknown)
- "email": string (or empty)
- "phone": string (or empty)
- "headline": string (current or desired role in 5-8 words)
- "skills": array of strings (top skills present in the resume)
- "matchedKeywords": array of strings (which job keywords appear or are clearly implied by the resume)
- "missingKeywords": array of strings (important required keywords NOT found in the resume, max 8)
- "sections": object with keys "experience", "education", "projects", "skills". Each value is an object: { "present": boolean, "quality": number 0-100, "note": string }
- "ratings": object with keys "skills", "experience", "education", "projects", "keywordMatch", "overall". Each value is a number 0-100.
- "strengths": array of 3-5 strings
- "concerns": array of 2-4 strings
- "rationale": string (2-3 sentences explaining the overall rating against the RULES and KEYWORDS)

${resumeText}`,
  };

  return prompts[type] || prompts.parseResume;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function proxyErrorMessage(status, body) {
  const text = body || "";
  if (status === 410 || /end of life|no longer available/i.test(text)) {
    return "The AI model is temporarily unavailable (it's being updated). Please try again in a few minutes.";
  }
  if (status === 401 || status === 403) {
    return "The AI service couldn't authenticate the request. Please check the API configuration.";
  }
  if (status === 429) {
    return "The AI service is busy right now. Please try again shortly.";
  }
  if (status >= 500) {
    return "The AI service had a temporary problem. Please try again.";
  }
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned
    ? `The AI request failed (${status}): ${cleaned.slice(0, 200)}`
    : `The AI request failed (${status}). Please try again.`;
}

/* Max parallel proxy calls across the whole app. Tunable via
   VITE_AI_CONCURRENCY so it can be matched to the AI plan's rate limits. */
const PROXY_CONCURRENCY = Math.max(
  1,
  Math.min(8, Number.parseInt(import.meta.env?.VITE_AI_CONCURRENCY ?? "", 10) || 4)
);
let proxyActive = 0;
const proxyQueue = [];

async function acquireProxySlot() {
  if (proxyActive < PROXY_CONCURRENCY) {
    proxyActive += 1;
    return () => {
      proxyActive -= 1;
      const next = proxyQueue.shift();
      if (next) next();
    };
  }
  await new Promise((resolve) => proxyQueue.push(resolve));
  proxyActive += 1;
  return () => {
    proxyActive -= 1;
    const next = proxyQueue.shift();
    if (next) next();
  };
}

const withProxySlot = (fn) => async (...args) => {
  const release = await acquireProxySlot();
  try {
    return await fn(...args);
  } finally {
    release();
  }
};

async function rawCallProxy(prompt, { json = true, onMeta, timeoutMs } = {}) {
  /* Batch evaluations can legitimately take minutes on the free proxy;
     a 60 s wall clock fired mid-flight and aborted whole batches. Large
     callers pass a longer timeout; aborts are also retryable now. */
  const REQUEST_TIMEOUT_MS = timeoutMs || 120000;
  if (!hasAccess()) {
    throw new Error("AI proxy not configured. Set VITE_AI_PROXY_URL in .env after deploying the Cloudflare Worker.");
  }

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let retryableStatus = null;
    try {
      log("Proxy call — attempt", attempt + 1);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const res = await fetch(aiConfig.proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, json }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      log("Proxy status:", res.status);

      if (res.status === 429 || res.status >= 500) {
        const retryAfter = res.headers.get("Retry-After");
        const baseMs =
          res.status === 429
            ? 3000 * 2 ** attempt
            : 1500 * 2 ** attempt;
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : baseMs + Math.random() * 800;
        const maxRetries = res.status === 429 ? RATE_LIMIT_RETRIES : MAX_RETRIES;
        warn(`Proxy ${res.status}, retry in ${Math.round(waitMs)}ms`);
        if (attempt < maxRetries) {
          retryableStatus = res.status;
          await sleep(waitMs);
          continue;
        }
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(proxyErrorMessage(res.status, errBody));
      }

      const data = await res.json();
      log("Proxy success");
      // The worker's fallback chain reports which provider served the
      // request ("gemini" | "nvidia"); surface it to callers that ask.
      if (typeof onMeta === "function" && data && data.provider) {
        try {
          onMeta({ provider: data.provider });
        } catch {
          // meta callbacks must never break the response path
        }
      }
      return data.result;
    } catch (err2) {
      lastError = err2;
      err("Proxy attempt", attempt + 1, "failed:", err2.message?.slice(0, 200));
      const isSlottedRetry = retryableStatus !== null;
      const maxRetries = retryableStatus === 429 ? RATE_LIMIT_RETRIES : MAX_RETRIES;
      const isAbort = err2.name === "AbortError" || /abort/i.test(err2.message || "");
      if ((isSlottedRetry || attempt < MAX_RETRIES) && attempt < maxRetries && !(isAbort && !isSlottedRetry)) {
        const base = isSlottedRetry ? 3000 : 1500;
        await sleep(base * 2 ** attempt + Math.random() * 800);
      }
    }
  }
  throw lastError;
}

const callProxy = withProxySlot(rawCallProxy);

function hash64(input) {
  let h1 = 5381;
  let h2 = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 = ((h1 * 33) ^ c) >>> 0;
    h2 = ((h2 * 16777619) ^ c) >>> 0;
  }
  return `${h1.toString(16)}${h2.toString(16)}`;
}

function cacheKey(type, resumeText) {
  return `${CACHE_PREFIX}:${hash64(`${type}:${resumeText}`)}`;
}

function readCache(key, input) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (entry.input !== input) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(key, data, input) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data, input }));
  } catch {
    // best-effort
  }
}

export function clearGeminiCache() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // best-effort
  }
}

const inFlight = new Map();
const IN_FLIGHT_TIMEOUT_MS = 120000;const observers = new Set();

/**
 * subscribeGemini — tiny observer seam so UI can visualize the AI request
 * lifecycle (hero stage meters, progress chips) without touching every
 * section component. Listeners receive (type, "start"|"done"|"error", payload?
 */
export function subscribeGemini(fn) {
  observers.add(fn);
  return () => observers.delete(fn);
}

function notify(type, state, payload) {
  observers.forEach((fn) => {
    try {
      fn(type, state, payload);
    } catch {
      // observer errors must never break generation
    }
  });
}

async function generate(type, resumeText, proxyOptions = {}) {
  if (!resumeText || !resumeText.trim()) {
    throw new Error("Add your resume text before running an analysis.");
  }

  const key = cacheKey(type, resumeText);
  const cached = readCache(key, `${type}:${resumeText}`);
  if (cached !== null) {
    log(type, "— cache hit");
    notify(type, "done", cached);
    return cached;
  }

  const inFlightKey = `${type}:${resumeText}`;
  if (inFlight.has(inFlightKey)) {
    log(type, "— awaiting in-flight request");
    return inFlight.get(inFlightKey);
  }

  log(type, "— cache miss, calling proxy...");
  notify(type, "start");
  const prompt = buildPrompt(type, resumeText);
  const timeout = setTimeout(() => {
    if (inFlight.has(inFlightKey)) {
      warn(type, "— in-flight request timed out, clearing");
      inFlight.delete(inFlightKey);
    }
  }, IN_FLIGHT_TIMEOUT_MS);
  const promise = callProxy(prompt, proxyOptions).then(
    (result) => {
      writeCache(key, result, `${type}:${resumeText}`);
      notify(type, "done", result);
      return result;
    },
    (err) => {
      notify(type, "error");
      throw err;
    }
  );
  inFlight.set(inFlightKey, promise);
  try {
    return await promise;
  } finally {
    clearTimeout(timeout);
    inFlight.delete(inFlightKey);
  }
}

export function parseJsonResponse(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Invalid input for parseJsonResponse");
  }
  let clean = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const jsonSub = text.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonSub);
      } catch {
        // Fallthrough
      }
    }
    // Last resort: salvage top-level candidate blocks individually.
    // Truncated/maxed-token responses and stray prose around the JSON used
    // to throw here, which demoted every candidate in the batch to the
    // local heuristic estimate. Salvage recovers each complete block so
    // one bad candidate no longer poisons the rest — and no token-burning
    // retry is needed. No effect on cleanly-parsed responses.
    const salvaged = salvageTopLevelBlocks(clean);
    if (salvaged) return salvaged;
    throw new Error("Failed to parse JSON response");
  }
}

/**
 * Brace-matching extraction of top-level blocks from a broken JSON object.
 * Scans for `"key": {` sequences, brace-matches each block (honoring
 * strings/escapes), and JSON.parses it independently. Blocks that fail to
 * parse (invalid) or terminate (truncated tail) don't stop the scan — the
 * scanner retries from just after the key, so a valid candidate nested
 * inside a broken one is still recovered. Returns the rebuilt map, or
 * null when nothing complete is found.
 */
export function salvageTopLevelBlocks(text) {
  if (!text || typeof text !== "string") return null;
  if (!text.includes("{")) return null;

  const map = {};
  let found = 0;
  const re = /"((?:[^"\\]|\\.)*)"\s*:\s*\{/g;
  let m;

  while ((m = re.exec(text))) {
    const key = m[1];
    const blockStart = re.lastIndex - 1;
    let depth = 0;
    let inString = false;
    let i = blockStart;
    const len = text.length;
    while (i < len) {
      const ch = text[i];
      if (inString) {
        if (ch === "\\") i += 1;
        else if (ch === '"') inString = false;
      } else if (ch === '"') {
        inString = true;
      } else if (ch === "{") {
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
      i += 1;
    }
    if (depth === 0) {
      const block = text.slice(blockStart, i + 1);
      try {
        const parsed = JSON.parse(block);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          map[key] = parsed;
          found += 1;
          re.lastIndex = i + 1; // consumed — continue after this block
          continue;
        }
      } catch {
        // Balanced but invalid — fall through to retry from inside.
      }
    }
    // Unbalanced (truncated) or invalid: resume scanning just after the
    // key so nested/blocked candidates are still found.
    re.lastIndex = m.index + 1;
  }

  return found > 0 ? map : null;
}

export const GeminiService = {
  parseResume: (resumeText) => generate("parseResume", resumeText),
  generateSummary: (resumeText) => generate("summary", resumeText),
  generateReadiness: (resumeText) => generate("readiness", resumeText),
  generateSkillGap: (resumeText) => generate("skillGap", resumeText),
  generateTargetRoles: (resumeText) => generate("targetRoles", resumeText),
  generateSkillDomains: (resumeText) => generate("skillDomains", resumeText),
  generateMissingSkills: (resumeText) => generate("missingSkills", resumeText),
  generateImprovements: (resumeText) => generate("improvements", resumeText),
  generateProjects: (resumeText) => generate("projects", resumeText),
  generateCertifications: (resumeText) => generate("certifications", resumeText),
  generateRoadmap: (resumeText) => generate("roadmap", resumeText),
  generateDSA: (resumeText) => generate("dsa", resumeText),
  generateInterviewQuestions: (resumeText) => generate("interviewQuestions", resumeText),
  expandKeywords: (keywords, extraContext = "") =>
    generate("expandKeywords", [keywords, extraContext].filter(Boolean).join("\n\n")),
  evaluateCandidate: (input) => generate("evaluateCandidate", input),
  /* 110 s: the NVIDIA edge 524s at ~100 s anyway (measured), so waiting
     longer per attempt only delays the retry/fallback cycle. */
  evaluateBatch: (input) => generate("evaluateBatch", input, { timeoutMs: 110000 }),
  hrChat: (prompt, onMeta) =>
    callProxy(prompt, { json: false, onMeta }),
};
