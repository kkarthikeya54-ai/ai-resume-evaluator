# Configure the APIs

> 🧰 Tutorials · Prev: [Get the API Keys](./get-api-keys.md)

Wire up the three service layers that make the app run for real: the **AI
proxy worker** (Gemini + NVIDIA fallback), the **HR API worker** (cloud
session sync), and **Supabase Storage** (optional cloud resume files).
Follow this exact order — each step unlocks the next.

## Overview

```
client (.env VITE_*)
  ├── VITE_AI_PROXY_URL ─────────────► AI proxy worker (secrets: GEMINI_API_KEY, NVIDIA_API_KEY)
  ├── VITE_FIREBASE_* ───────────────► Firebase Auth (sign-in) + Firestore (profiles)
  └── VITE_SUPABASE_URL/ANON_KEY ────► Supabase Storage (resume files, bucket "resumes")
client Bearer token ─────────────────► HR API worker (secret: FIREBASE_WEB_API_KEY) → KV
```

## 1 · AI proxy worker (Gemini + NVIDIA fallback)

This is the server that holds the LLM keys. Nothing else may hold them.

```bash
cd worker
npx wrangler login                # interactive, one time
npx wrangler secret put GEMINI_API_KEY    # paste from Get the API Keys
npx wrangler secret put NVIDIA_API_KEY    # optional fallback; omit to disable it
npx wrangler deploy               # prints your worker URL
```

Then point the client at it — root `.env`:

```env
VITE_AI_PROXY_URL=https://<your-subdomain>.workers.dev
```

Restart the dev server. Sanity check:

```bash
node scripts/_worker_test.mjs     # 12 behavioral tests against the real ai-proxy.js
curl https://<your-subdomain>.workers.dev/models   # lists the configured provider chain
```

> **Why not `VITE_GEMINI_API_KEY`?** A `VITE_*` key is compiled into the
> browser bundle and visible to anyone. The worker keeps the key server-side;
> the client only ever sees the worker's public URL. (Legacy docs mention a
> `VITE_GEMINI_API_KEY`/`VITE_GEMINI_PROXY_URL` path — it is **gone**; current
> config only reads `VITE_AI_PROXY_URL`, see [Services → AI Gateway](../services/ai-gateway.md).)

### Optional tunables (client-side, names only)

| Env var | Default | Meaning |
| --- | --- | --- |
| `VITE_AI_CONCURRENCY` | 4 | Max parallel proxy calls app-wide (1–8) |
| `VITE_HR_CONCURRENCY` | 6 | Parallel candidate batches in an HR run |
| `VITE_HR_BATCH_SIZE` | 3 | Candidates per AI batch call |
| `VITE_HR_FAST_LOCAL_THRESHOLD` | 0 | Min file count that forces the fast local engine |

## 2 · HR API worker (cloud session sync)

Syncs HR sessions (and multi-device recovery) through a Cloudflare Worker +
KV, scoped to the signed-in user's Firebase UID.

```bash
cd worker
npx wrangler secret put FIREBASE_WEB_API_KEY -c wrangler.hr-api.toml
npx wrangler deploy -c wrangler.hr-api.toml
```

`FIREBASE_PROJECT_ID` and `ALLOWED_ORIGINS` are plaintext `[vars]` in
`worker/wrangler.hr-api.toml` (already set; `ALLOWED_ORIGINS="*"` is the dev
default — pin it in prod). The worker **verifies the Firebase ID token** on
every request and derives all KV keys from the caller's UID — see
[Backend → HR API Worker](../backend/hr-api.md).

> Without this worker, the HR workspace is fully local-only. Multi-device
> recovery via `/hr?session=<id>` is the only thing that
> [degrades](../operations/configuration.md) — it falls back to redirecting
> to `/sessions`.

## 3 · Supabase Storage (optional cloud resume files)

Resume uploads default to **local-first** storage (blob URL + metadata in
localStorage via `services/resumeStorage.js`). When the two Supabase env vars
are set, the same facade stores the resume **file** in the public `resumes`
bucket instead; **metadata and text stay in the browser** (`localStorage`).

```bash
# 1. Create a Supabase project (free tier). 2. Create a public bucket named: resumes
# 3. Leave "Create policies" off — no anonymous insert/update policies.
# 4. Copy Project URL + anon key into root .env:
```

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Storage layout: `resumes/{uid}/{timestamp}-{filename}`. Deletes from the app
(`removeResume`) list the user's prefix and delete every object — including
orphans — see [Services → Storage](../services/storage.md).

> 🔒 These objects are in a **public** bucket *by design* (files render
> directly in browser previews). If that doesn't fit your data policy,
> local-only mode (omit the vars) keeps everything on-device — which is the
> app's default and privacy-safe posture (see
> [Data & Privacy → Privacy & Deletion](../data-and-privacy/privacy-and-deletion.md)).

## Degraded modes (what still works without what)

| Missing | What happens |
| --- | --- |
| Firebase vars | Landing works; auth pages explain config missing; no cloud persistence |
| `VITE_AI_PROXY_URL` | Everything except AI: parsing/sessions/storage work; AI sections show clear errors; HR pipeline uses the heuristic fallback engine |
| HR API worker | Local-only HR (IndexedDB is the source of truth); multi-device recovery redirects to `/sessions` |
| Supabase vars | Resume storage stays 100% local (the default) |

---

**Related pages:** [Get the API Keys](./get-api-keys.md) · [Operations → Configuration](../operations/configuration.md) · [Backend → Worker Proxy](../backend/worker-proxy.md) · [Backend → HR API Worker](../backend/hr-api.md) · [Services → Storage](../services/storage.md)