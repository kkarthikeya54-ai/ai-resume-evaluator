/**
 * AI Proxy - Cloudflare Worker (free plan; no Firebase involved).
 *
 * Fallback chain, entirely server-side:
 *   1. Gemini (Google AI Studio key) - default, tried first
 *   2. NVIDIA  (NIM API key)         - automatic fallback
 *
 * Client contract unchanged: POST { prompt, json } -> { result }.
 * Additive: response carries `provider`; request may pass
 * `provider: "nvidia" | "gemini"` to reorder the chain.
 *
 * A provider hands off to the next on any failure that will not fix
 * itself by waiting (quota, rate limits, 5xx, empty content, auth).
 * If all failures are quota-type the response is 429 so the client's
 * existing backoff runs; otherwise 502.
 *
 * Secrets (wrangler secret put): GEMINI_API_KEY, NVIDIA_API_KEY.
 * Keys never reach the browser; a missing key drops that provider.
 */

const GEMINI_MODEL = "gemini-3.8-flash";
// Text models to try in order. NVIDIA NIM retires models over time
// (llama-3.x hit end-of-life 2026-08-26), so the worker walks this list
// and skips any that return 410/404. Front-loaded with JSON-strong
// instruct models; NVIDIA's own Nemotron line is actively maintained.
const NVIDIA_MODELS = [
  // Benchmarked on real evaluation prompts (Sep 2026): mistral-nemotron is
  // the only model here that reliably returns valid JSON within the edge
  // window. gpt-oss-20b is fast on small prompts but overthinks long ones;
  // 90b-vision 524s; nemotron-70b / mistral-nemo are dead endpoints (404)
  // and get skipped instantly by the walk.
  "mistralai/mistral-nemotron",
  "openai/gpt-oss-20b",
  "meta/llama-3.2-90b-vision-instruct",
];
const NVIDIA_TEMPERATURE = 0.2; // low temp for stable, valid JSON

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Statuses where retrying later could plausibly succeed.
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function jsonResponse(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

/** Gemini generateContent. Success: { candidates[].content.parts[].text }. */
async function callGemini(prompt, env) {
  const key = env.GEMINI_API_KEY;
  if (!key) {
    return { ok: false, retryable: false, error: "Gemini: GEMINI_API_KEY not set" };
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    GEMINI_MODEL +
    ":generateContent?key=" +
    encodeURIComponent(key);

  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 8192 },
      }),
    });
  } catch (err) {
    return { ok: false, retryable: true, error: "Gemini network error: " + err.message };
  }

  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = body?.error?.message || "";
    return {
      ok: false,
      retryable: RETRYABLE.has(resp.status),
      error: "Gemini " + resp.status + ": " + String(msg).slice(0, 300),
    };
  }

  const parts = body?.candidates?.[0]?.content?.parts || [];
  const content = parts.map((p) => p.text || "").join("");
  if (!content) {
    const reason = body?.candidates?.[0]?.finishReason || body?.promptFeedback?.blockReason || "empty";
    return { ok: false, retryable: true, error: "Gemini returned no content (" + reason + ")" };
  }
  return { ok: true, content, provider: "gemini" };
}

/** NVIDIA - OpenAI-compatible chat completions. Walks NVIDIA_MODELS so
 * retired (410) models are skipped automatically. */
async function callNvidia(prompt, env, nvidiaModelOverride) {
  const key = env.NVIDIA_API_KEY;
  if (!key) {
    return { ok: false, retryable: false, error: "NVIDIA: NVIDIA_API_KEY not set" };
  }

  const failures = [];
  // Optional per-model override (used for probing / benchmarking):
  // POST body { nvidiaModel: "..." } targets exactly one model.
  const models = nvidiaModelOverride ? [nvidiaModelOverride] : NVIDIA_MODELS;
  for (const model of models) {
    let resp;
    try {
      resp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: NVIDIA_TEMPERATURE,
          top_p: 0.95,
          // Cap output: models can degenerate into repetition on long JSON
          // and run to the cap (NVIDIA's edge then 524s at ~100 s). ~2k
          // tokens comfortably fits a 3-candidate evaluation; truncated
          // responses are recovered client-side by per-candidate salvage.
          max_tokens: 2048,
          // NOTE: response_format json_object is intentionally NOT set —
          // several NIM models degenerate (run to timeout) under it. The
          // prompt instructs JSON-only and extractResult/salvage handle
          // fences or prose around the JSON.
        }),
      });
    } catch (err) {
      return { ok: false, retryable: true, error: "NVIDIA network error: " + err.message };
    }

    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = body?.error?.message || body?.detail || "";
      const failure = "NVIDIA " + resp.status + " (" + model + "): " + String(msg).slice(0, 200);
      // Model-specific pathologies (retired 410/404, edge timeout 524/504,
      // server 500/502/503) should not block the remaining models — walk.
      // Auth (401/403) and 429 are account-wide; report immediately.
      if ([410, 404, 524, 504, 500, 502, 503].includes(resp.status)) {
        failures.push(failure);
        continue;
      }
      return {
        ok: false,
        retryable: RETRYABLE.has(resp.status),
        error: failure,
      };
    }

    const content = body?.choices?.[0]?.message?.content || "";
    if (!content) {
      return { ok: false, retryable: true, error: "NVIDIA returned no content (" + model + ")" };
    }
    return { ok: true, content, provider: "nvidia" };
  }
  return { ok: false, retryable: false, error: failures.join(" | ") || "NVIDIA: no models available" };
}

const PROVIDERS = { gemini: callGemini, nvidia: callNvidia };

/** Extract the JSON payload the client expects from raw model text. */
function extractResult(content, wantJson) {
  if (!wantJson) return content;
  try {
    return JSON.parse(content);
  } catch {
    const fence = /\x60{3}(?:json)?\s*([\s\S]*?)\x60{3}/;
    const match = content.match(fence);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        return content;
      }
    }
    return content;
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    // Debug route: list the NVIDIA models this account can actually call
    // (uses the worker's key server-side; the key itself never leaves).
    // GET /models
    if (request.method === "GET" && new URL(request.url).pathname === "/models") {
      if (!env.NVIDIA_API_KEY) return jsonResponse(500, { error: "NVIDIA_API_KEY not set" });
      const resp = await fetch("https://integrate.api.nvidia.com/v1/models", {
        headers: { Authorization: "Bearer " + env.NVIDIA_API_KEY },
      }).catch(() => null);
      if (!resp || !resp.ok) {
        return jsonResponse(502, { error: "Could not list NVIDIA models" });
      }
      const body = await resp.json().catch(() => ({}));
      const ids = (body?.data || []).map((m) => m.id).filter(Boolean).sort();
      return new Response(JSON.stringify({ count: ids.length, models: ids }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return jsonResponse(400, { error: "Invalid JSON body" });
    }

    const prompt = requestBody.prompt;
    const wantJson = requestBody.json !== false;
    const requested = requestBody.provider;
    const nvidiaModelOverride = requestBody.nvidiaModel;

    if (!prompt) {
      return jsonResponse(400, { error: "Missing 'prompt' field" });
    }

    // Gemini is the default; provider "nvidia" flips the chain order.
    const order = requested === "nvidia" ? ["nvidia", "gemini"] : ["gemini", "nvidia"];
    const failures = [];

    for (const name of order) {
      let out;
      try {
        out = await PROVIDERS[name](prompt, env, nvidiaModelOverride);
      } catch (err) {
        out = { ok: false, retryable: true, error: name + ": " + err.message };
      }

      if (out.ok) {
        const headers = { "Content-Type": "application/json", ...CORS_HEADERS };
        // Diagnostics: when the first provider fails and the fallback serves,
        // expose WHY so dead/rotated keys and quota exhaustion are visible
        // from a single curl (no dashboard required).
        if (failures.length > 0) {
          headers["x-ai-fallback-from"] = order[0];
          headers["x-ai-fallback-reason"] = failures.join(" | ").slice(0, 400);
        }
        return new Response(
          JSON.stringify({ result: extractResult(out.content, wantJson), provider: out.provider }),
          { status: 200, headers }
        );
      }
      failures.push(out.error);
    }

    // Quota-type exhaustion mirrors as 429 so client backoff runs; else 502.
    const allQuota = failures.length > 0 && failures.every((e) => /\b429:/.test(e));
    return jsonResponse(allQuota ? 429 : 502, {
      error: "All providers failed: " + failures.join(" | "),
    });
  },
};
