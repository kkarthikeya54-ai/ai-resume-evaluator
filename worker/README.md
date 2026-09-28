# AI Proxy Worker (Cloudflare) — Gemini default + NVIDIA fallback

A free Cloudflare Worker that fronts the AI providers for the whole app.
It keeps API keys server-side and runs a **two-provider fallback chain**:

1. **Gemini** (`GEMINI_API_KEY`, model `gemini-3.8-flash`) — default, tried first
2. **NVIDIA NIM** (`NVIDIA_API_KEY`, model `meta/llama-3.2-11b-vision-instruct`) — automatic fallback

If the first provider returns a quota/rate-limit error (429), a server
error (5xx), or an empty/blocked response, the worker transparently
retries with the next provider and returns the same response shape. The
client can't tell a failover happened — except by reading the `provider`
field in the response.

> Why a Worker? Cloud Functions on the Firebase **Spark (free) plan cannot
> make outbound HTTPS calls**, so the proxy layer lives on Cloudflare's
> free plan instead (100k requests/day) — outside Firebase entirely.

## Client contract (unchanged)

```
POST /
{ "prompt": "...", "json": true }        →  { "result": <parsed JSON|text>, "provider": "gemini" }
{ "prompt": "...", "json": false }       →  { "result": "<raw text>",       "provider": "nvidia" }
{ "prompt": "...", "provider": "nvidia" }  // optional: flips the chain order
```

Errors: `429` when every provider failed with quota-type errors (the
client's existing backoff handles this), `502` for anything else, with
`{ "error": "All providers failed: <reason 1> | <reason 2>" }`.

## Setup (one-time, ~5 min)

1. Create a free Cloudflare account: https://dash.cloudflare.com/sign-up
2. Install the CLI (skip if using `deploy.js`):
   ```
   npm install -g wrangler
   wrangler login
   ```
3. Get your two API keys:
   - **Gemini (default):** https://aistudio.google.com/apikey — free tier,
     no credit card. Key looks like `AIza…`.
   - **NVIDIA (fallback):** https://build.nvidia.com — free credits for a
     dev account. Key looks like `nvapi-…`.
4. Set both as worker secrets (never in code, never in git):
   ```
   cd worker
   wrangler secret put GEMINI_API_KEY
   wrangler secret put NVIDIA_API_KEY
   ```
5. Deploy:
   ```
   wrangler deploy
   ```
   (or `node deploy.js` with a dashboard cookie in `%TEMP%/cf-cookie.txt` —
   it reads the source from `ai-proxy.js`, so it can never deploy a stale copy)
6. Copy the printed worker URL into the root `.env`:
   ```
   VITE_AI_PROXY_URL=https://ai-proxy.YOUR_SUBDOMAIN.workers.dev
   ```
7. Restart the dev server: `npm run dev`

## Behavioral tests

```
node scripts/_worker_test.mjs
```

12 tests cover: Gemini success, 429 → NVIDIA failover, empty-content
failover, chain reordering, missing-key handling, mirrored 429 vs 502,
fenced-JSON extraction, CORS preflight, and the verbatim (non-JSON)
copilot path.

## Security notes

- Both keys are worker secrets — they never reach the browser and are
  never bundled into the client.
- A missing/invalid key drops that provider from the chain instead of
  failing the whole request.
- **Never commit keys.** If a key ever lands in git history, rotate it
  immediately in the provider dashboard.
