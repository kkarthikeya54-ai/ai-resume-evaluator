# Free Hosting Runbook — what YOU do vs. what can be automated

> 🛠️ Operations · Deploy walkthrough: [Deployment](./deployment.md) · Worker details: [Backend](../backend/README.md)

Everything in this app already runs on free tiers. This page separates the steps that
**require a human** (interactive logins, secret entry, console clicks) from what an
agent or CI can do for you.

## Cost map (all $0)

| Piece | Free tier | Where it runs |
| --- | --- | --- |
| Frontend SPA | **Vercel** (current host) — or Firebase Hosting / Cloudflare Pages — unlimited static requests | `dist/` from `npm run build` |
| AI proxy worker | Cloudflare Workers free plan (100k req/day) | `worker/` → `nvidia-proxy` |
| HR API worker | Cloudflare Workers free plan + Workers KV free tier | `worker/` → `hr-api` |
| Auth | Firebase Auth free (Spark) — email/password + Google | Firebase |
| Student cloud sync | Firestore free quota (profiles) + Supabase free tier (resume files) | Firebase + Supabase |
| AI inference | Gemini free tier (aistudio key) with NVIDIA NIM free fallback — key lives server-side in the worker | Cloudflare |
| HR resume processing | **Zero tokens** — local in-browser scoring (default engine) | The user's browser |

## Only you can do these (≈ 20 minutes, one time)

| # | Step | Why it needs you |
| --- | --- | --- |
| 1 | Create/log in to a **Cloudflare** account, then `npx wrangler login` (browser consent) | Interactive OAuth |
| 2 | Create/log in to a **Firebase** project; enable Email/Password + Google auth; add your deployed domain under Auth → Authorized domains | Console clicks; second-factor on the Google account |
| 3 | Get a **Gemini key** at aistudio.google.com and run `npx wrangler secret put GEMINI_API_KEY` (worker dir) — same for `NVIDIA_API_KEY` if you want the fallback, and `FIREBASE_WEB_API_KEY` for the hr-api worker | Secrets must never pass through an agent or repo |
| 4 | Create a **Vercel project** and connect the Git repo (or `npx vercel --prod`); add the domain to Firebase Authorized domains | Account ownership |
| 5 | Create a **Supabase** project (free tier) with a public bucket named **`resumes`**; copy URL + anon key | Console clicks |
| 6 | Add `VITE_*` env vars in the host's project settings (names in [Configuration](./configuration.md)) | Project settings UI |

## Agent / CI can do these

- `npm run lint`, `npm test`, `npm run test:ui`, `npm run build` — every gate
- `npx wrangler deploy` / `npx wrangler deploy -c wrangler.hr-api.toml` — once `wrangler login` has been done on the machine
- `firebase deploy --only firestore:rules,storage` — rules only (no Blaze needed); Cloud Function deploys still fail on Spark, skip them
- `npx vercel --prod` — after you've authenticated once
- Code/docs/test changes, worker route/model updates, benchmarking, and the UI regression sweep

## Recommended go-live order

1. `npm run build` → deploy `dist/` to Vercel (SPA fallback via `vercel.json`).
2. Deploy both workers (AI proxy first, then hr-api) and set the three secrets.
3. Point `VITE_AI_PROXY_URL` at the `nvidia-proxy` worker URL; rebuild the frontend.
4. Firebase console: add the Vercel domain to Authorized domains; deploy rules. Create the Supabase `resumes` bucket.
5. Smoke-test live: sign up → run a 3-resume HR screen → verify email → cloud-sync a session → upload a resume with Supabase configured.

---

**Related pages:** [Deployment](./deployment.md) · [Configuration](./configuration.md) · [HR API Worker](../backend/hr-api.md) · [Worker Proxy](../backend/worker-proxy.md)
