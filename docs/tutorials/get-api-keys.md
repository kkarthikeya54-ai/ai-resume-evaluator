# Get the API Keys

> 🧰 Tutorials · Prev: [Firebase Setup](./firebase-setup.md) · Next: [Configure the APIs](./configure-apis.md)

Where every credential comes from, what each one is for, and — most
importantly — **which ones are safe to put in `.env` and which must never
leave your machine**.

## The golden rule

| Kind of key | Storage | Because |
| --- | --- | --- |
| **LLM keys** (`GEMINI_API_KEY`, `NVIDIA_API_KEY`) | Worker **secrets** only — never in `.env`, never in the repo, never in the bundle | `VITE_*` variables are compiled into the client bundle and visible to anyone |
| **Firebase web config (6 values)** | `.env` as `VITE_FIREBASE_*` | Public by design — they ship with the browser bundle; Security Rules are the real protection |
| **Supabase URL + anon key** | `.env` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Publishable credentials — RLS / bucket policies are the real protection |
| **HR worker secret** (`FIREBASE_WEB_API_KEY`) | Worker **secret** only | Server-side; never in the bundle |

Only the "firebase / supabase / proxy URL" rows ever touch `.env`. The LLM
keys are set with `wrangler secret put` and are read exclusively by the
server-side [AI Proxy worker](../backend/worker-proxy.md).

## 1 · Gemini API key (primary AI model)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in.
2. Click **Create API key** → pick the project → copy the key.
3. Free tier, **no credit card required**. Key looks like `AIza…`.
4. Where it goes: `wrangler secret put GEMINI_API_KEY` in `worker/` (see
   [Configure the APIs → AI proxy](./configure-apis.md#ai-proxy-worker-gemini--nvidia-fallback)).

The model is read server-side by the worker (`GEMINI_MODEL` default
`gemini-3.8-flash`, defined in `worker/ai-proxy.js`) — you tune the model in
the worker code, not in the client.

## 2 · NVIDIA NIM API key (fallback model)

1. Go to [build.nvidia.com](https://build.nvidia.com) and create a dev account.
2. Free credits for development. Key looks like `nvapi-…`.
3. Where it goes: `wrangler secret put NVIDIA_API_KEY` — same worker, see
   [Configure the APIs → AI proxy](./configure-apis.md#ai-proxy-worker-gemini--nvidia-fallback).

The worker tries a **walk list** of NVIDIA-hosted models in order:
`mistralai/mistral-nemotron`, `openai/gpt-oss-20b`,
`meta/llama-3.2-90b-vision-instruct` — see
[Backend → Worker Proxy](../backend/worker-proxy.md). If a model 429s or is
missing, the worker moves to the next one.

## 3 · Firebase Web API key

1. Firebase console → **Project settings → General → Your apps → Web app**.
2. The `apiKey` value in the SDK snippet **is** the Web API key (the same
   one you already copied into `VITE_FIREBASE_API_KEY` in
   [Firebase Setup](./firebase-setup.md)).
3. Why there are *two* consumers:
   - The **client** uses it to talk to Firebase Auth directly (public by design).
   - The **HR API worker** uses it server-side as the `FIREBASE_WEB_API_KEY`
     secret to verify ID tokens via the Identity Toolkit endpoints
     (see [Backend → HR API Worker](../backend/hr-api.md)).

## 4 · Supabase anon key (optional cloud resume files)

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. **Project Settings → API** → copy the **Project URL** and the **anon /
   publishable** key.
3. Do **not** use the `service_role` key — it bypasses all security and is a
   true secret. The anon key is designed to ship in the client; the bucket's
   access rules are the protection.
4. Where they go: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env`
   (optional — resume storage stays local without them, see
   [Configure the APIs → Supabase Storage](./configure-apis.md#supabase-storage)).

---

**Related pages:** [Firebase Setup](./firebase-setup.md) · [Configure the APIs](./configure-apis.md) · [Backend → Worker Proxy](../backend/worker-proxy.md) · [Operations → Configuration](../operations/configuration.md)