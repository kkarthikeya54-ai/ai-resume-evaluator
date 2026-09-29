# Configuration

> 🛠️ Operations · Next: [Deployment](./deployment.md)

Template: `.env.example` → copy to `.env`. **All `VITE_*` values are public by design** (they're inlined into the browser bundle) — real secrets live server-side only.

## Client variables

| Variable | Used by | Required for |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | `config/firebase.js` | Auth / Firestore profiles |
| `VITE_FIREBASE_AUTH_DOMAIN` | 〃 | 〃 |
| `VITE_FIREBASE_PROJECT_ID` | `config/firebase.js` | 〃 |
| `VITE_FIREBASE_STORAGE_BUCKET` | 〃 | *(legacy — the Firebase Storage path is dead code; resume files now go to Supabase)* |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | 〃 | 〃 |
| `VITE_FIREBASE_APP_ID` | 〃 | 〃 |
| `VITE_AI_PROXY_URL` | `config/ai.js` | All AI features |
| `VITE_SUPABASE_URL` | `supabaseResumeStorage.js` | Optional cloud resume **files** (bucket `resumes`); metadata/text stay local |
| `VITE_SUPABASE_ANON_KEY` | 〃 | 〃 |
| `VITE_FUNCTIONS_BASE_URL` | *(legacy — no longer read)* | HR cloud sync moved to the HR API Worker; `hrBackend.js` now hard-codes the worker URL (`HR_API_BASE`) |
| `VITE_AI_STUDIO_API_KEY`, `VITE_AI_STUDIO_MODEL` | — | Legacy names; **not in `.env.example` and not referenced by current source** |

Optional tunables (client-side, fine to leave unset):

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_AI_CONCURRENCY` | 4 | Max parallel AI proxy calls (1–8) |
| `VITE_HR_CONCURRENCY` | 6 | Parallel candidate batches in an HR run |
| `VITE_HR_BATCH_SIZE` | 3 | Candidates per AI batch call |
| `VITE_HR_FAST_LOCAL_THRESHOLD` | 0 | Min file count that forces the fast local engine |

`config/firebase.js` treats the app as **configured** only when all six Firebase values are present and non-placeholder — otherwise it runs in degraded no-cloud mode (auth/storage functions throw helpful messages instead of crashing).

## Server-side configuration

| Variable / secret | Where it lives | Used by |
| --- | --- | --- |
| `GEMINI_API_KEY` | Cloudflare secret (`wrangler secret put`) | AI proxy Worker (Gemini, tried first) |
| `NVIDIA_API_KEY` | Cloudflare secret (`wrangler secret put`) or Firebase secret (`defineSecret`) | AI proxy Worker fallback + `analyzeResume` (legacy) |
| `FIREBASE_WEB_API_KEY` | Cloudflare secret (`wrangler secret put FIREBASE_WEB_API_KEY -c wrangler.hr-api.toml`) | The HR API Worker's token verification |
| `ALLOWED_ORIGINS` | Function env config + worker `[vars]` (`wrangler.hr-api.toml`) | CORS allowlist (dev default `*`; pin in prod) |
| `LLM_MODEL` | Function env config | Legacy function model selection (the worker hard-codes its chain in `ai-proxy.js`) |

## Degraded modes (what still works without what)

| Missing | App behavior |
| --- | --- |
| Firebase env vars | Browse landing; auth pages explain configuration is missing; no cloud persistence |
| `VITE_AI_PROXY_URL` | Everything except AI: parsing, sessions, storage work; AI sections show clear errors; HR pipeline uses the heuristic fallback |
| HR API Worker unreachable | Local-only HR (IndexedDB is the source of truth anyway); multi-device recovery for a session opened via `/hr?session=<id>` falls back to redirecting to `/sessions` |
| Supabase vars | Resume storage stays 100% local (the default); nothing breaks |
| Redis/DB/etc. | N/A — there are none |

---

**Related pages:** [Deployment](./deployment.md) · [Backend → HR API Worker](../backend/hr-api.md) · [Backend → Worker Proxy](../backend/worker-proxy.md)
