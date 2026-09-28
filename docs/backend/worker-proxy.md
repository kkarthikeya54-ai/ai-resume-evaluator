# Worker Proxy (`worker/ai-proxy.js`)

> ☁️ Backend · Prev: [Cloud Functions](./cloud-functions.md) · Next: [HR API Worker](./hr-api.md)

The Cloudflare Worker AI proxy — the default `VITE_AI_PROXY_URL` target. Free plan (100k requests/day), no Firebase involvement (Cloud Functions can't make outbound calls on the Spark plan).

## Provider chain

| Order | Provider | Secret | Model |
| --- | --- | --- | --- |
| 1 (default) | Google Gemini | `GEMINI_API_KEY` | `gemini-3.8-flash` |
| 2 (fallback) | NVIDIA NIM | `NVIDIA_API_KEY` | `meta/llama-3.2-11b-vision-instruct` |

Failover is **transparent**: if the active provider returns a 429 (quota/rate limit), a 5xx, or empty/blocked content, the worker retries with the next provider and returns the same response shape. The response's `provider` field reveals which one served the request.

## Contract

```
POST /  { prompt: string, json?: boolean, provider?: "nvidia" | "gemini" }
   │
   ▼  tries the chain in order, injecting keys server-side
{ result: <parsed JSON> | <raw string>, provider: "gemini" | "nvidia" }
```

- `json: true` (default): strict `JSON.parse` → markdown-fence salvage → raw string fallback.
- `json: false`: content returned verbatim (the copilot's mode).
- `provider: "nvidia"` reorders the chain (NVIDIA first).
- Errors: `429` when **every** provider failed with quota-type errors (so the client's existing backoff runs), `502` otherwise — body carries each provider's joined reason.
- Missing key: that provider is dropped from the chain without a network call.
- CORS: `POST, OPTIONS` + `Content-Type` preflight.

## Secret handling

```bash
cd worker
wrangler secret put GEMINI_API_KEY
wrangler secret put NVIDIA_API_KEY
wrangler deploy        # or: node deploy.js
```

Keys never appear in the repo, the client bundle, or any URL — only the worker's URL is public.

## Files

| File | Purpose |
| --- | --- |
| `worker/ai-proxy.js` | The multi-provider fetch handler (everything above) |
| `worker/wrangler.toml` | Worker config (`main = "ai-proxy.js"`) |
| `worker/deploy.js` | Cookie-auth deploy helper; **reads `ai-proxy.js` from disk** so it can never deploy a stale copy |
| `worker/README.md` | Setup steps + behavioral tests |
| `scripts/_worker_test.mjs` | 12 behavioral tests (stubbed fetch): failover, mirrored 429/502, fenced-JSON, CORS, copilot path |

## Worker vs Cloud Function (which to use?)

| | Cloudflare Worker | `analyzeResume` Function |
| --- | --- | --- |
| Latency | Edge-fast | Cold starts possible |
| Providers | Gemini → NVIDIA chain | Single (whatever the function calls) |
| Free-plan constraint | None (Workers are free) | **Spark plan blocks outbound calls** |
| Response cache | None | 30-min server cache |
| Same client contract | ✅ `{prompt, json}` | ✅ identical |

The client (`gemini.js`) is agnostic — either URL works. Running **both** is fine; the second acts as a manual fallback.

---

**Related pages:** [Cloud Functions](./cloud-functions.md) · [HR API Worker](./hr-api.md) · [Services → AI Gateway](../services/ai-gateway.md) · [Operations → Deployment](../operations/deployment.md)
