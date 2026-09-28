# Launch-Day Checklist — Firebase + Cloudflare (all free tiers)

> 🛠️ Operations · Cost map: [Free Hosting Runbook](./free-hosting-runbook.md) · Deploy walkthrough: [Deployment](./deployment.md) · Workers: [Backend](../backend/README.md)

Every console click, secret, and command needed to take HireTire from local
dev to a live public site. Items are tagged:

- **[YOU]** — requires your browser login / Google 2SV / console clicks. Only you can do these.
- **[ME]** — an agent or CI can run this on your behalf (give the command or ask me).

**Known values used below** (already in the repo — don't invent your own):

| Thing | Value |
|---|---|
| Firebase project | `ai-driven-resume-evaluator` |
| AI proxy Worker | `nvidia-proxy` (`worker/wrangler.toml`, secrets: `GEMINI_API_KEY`, `NVIDIA_API_KEY`) |
| HR sync Worker | `hr-api` (`worker/wrangler.hr-api.toml`, secret: `FIREBASE_WEB_API_KEY`, KV binding `HR_KV`) |
| hr-api URL (hard-coded in `src/services/hrBackend.js`) | `https://hr-api.kkarthikeya54.workers.dev` |
| Client env vars (Pages build settings) | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_AI_PROXY_URL` |

> ⚠️ The hr-api URL is **hard-coded**, not an env var. If your Cloudflare
> subdomain ever changes, edit `HR_API_BASE` in `src/services/hrBackend.js`
> and rebuild. (Moving it to `VITE_HR_API_URL` is a 5-line change if wanted.)

---

## 0 · Preconditions — already done ✅

- [x] Repo committed at `5dae0c1` with `worker/` configs, `emulator.firebase.json` (dev-only), docs
- [x] KV namespace created and bound in `worker/wrangler.hr-api.toml` (`HR_KV`)
- [x] Auth emulator hijack is **opt-in only** (`VITE_HIJACK_AUTH_EMULATOR`) — production builds can never hit it
- [x] LinkedIn stub removed; auth surfaces are Email/Password + Google only

---

## 1 · Firebase console (`console.firebase.google.com` → project `ai-driven-resume-evaluator`)

### 1.1 Sign-in providers — `Authentication → Sign-in method`
- [ ] **[YOU]** Verify **Email/Password** = *Enabled* (it is today)
- [ ] **[YOU]** Verify **Google** = *Enabled*. If not: click it → toggle Enable → set **Support email** to your address → Save. This is the #1 cause of "Google login returns 400".
- [ ] **[YOU]** Nothing else needs enabling — no LinkedIn, no phone.

### 1.2 Authorized domains — `Authentication → Settings (gear) → Authorized domains`
This is the step that breaks Google sign-in after hosting if skipped.

Current list (verified): `localhost`, `ai-driven-resume-evaluator.firebaseapp.com`, `ai-driven-resume-evaluator.web.app`, `xz3dtv4v-5173.inc1.devtunnels.ms`.

- [ ] **[YOU]** Click **Add domain** → add your **Cloudflare Pages domain**, e.g. `hiretire.pages.dev` (exact value shown when the Pages project is created in step 3)
- [ ] **[YOU]** If you attach a custom domain (e.g. `hiretire.com`), add that too — *after* it resolves in step 3.4
- [ ] **[YOU]** Leave `localhost` in place — it's what keeps local dev working
- [ ] **[ME]** After you add them, I can re-verify the live domain list via the Identity Toolkit config endpoint and confirm the sign-in handler answers 200 for the new origin

### 1.3 Firestore — `Firestore Database`
- [ ] **[YOU]** Verify a database exists (region of your choice). Used by `userProfile.js` + `cloudResumeStorage.js` only — light traffic.
- [ ] **[YOU]** Verify rules are the least-privilege set from [`docs/backend/security-rules.md`](../backend/security-rules.md) (auth-required reads/writes).

### 1.4 Storage — `Cloud Storage` *(only if you want resume files in the cloud)*
- [ ] **[YOU]** ⚠️ Firebase has been requiring the paid Blaze plan to activate **new** Storage buckets. The app works fully without it: resumes are parsed and scored on-device and stored locally; HR session metadata still syncs via the KV worker. Skip unless you specifically want file upload — if the console demands Blaze, skip and note it.

### 1.5 Email verification
- [ ] **[YOU]** Nothing to configure — `sendEmailVerification` uses Firebase's default sender. Optional polish: `Authentication → Templates` to customize the verification email wording.

---

## 2 · Cloudflare Workers (`dash.cloudflare.com` → Workers & Pages)

### 2.1 `nvidia-proxy` — AI calls (Gemini primary, NVIDIA fallback)
- [ ] **[YOU]** Log in once so I can drive the rest: `npx wrangler login` (browser popup → Allow)
- [ ] **[ME]** Deploy: `cd worker && npx wrangler deploy` (uses `wrangler.toml` → `nvidia-proxy`)
- [ ] **[YOU]** Get keys: free Gemini key at `aistudio.google.com/apikey`, free NVIDIA key at `build.nvidia.com`
- [ ] **[ME]** Set secrets (paste each value when prompted):
  ```bash
  cd worker && npx wrangler secret put GEMINI_API_KEY
  cd worker && npx wrangler secret put NVIDIA_API_KEY
  ```
- [ ] **[ME]** Smoke-test: POST a tiny evaluate prompt to `https://<your-subdomain>.workers.dev/evaluate` and confirm 200 + JSON

### 2.2 `hr-api` — HR session sync (auth-guarded KV)
- [ ] **[ME]** Deploy: `cd worker && npx wrangler deploy -c wrangler.hr-api.toml`
- [ ] **[ME]** Set secret (use the **same Web API key** as `VITE_FIREBASE_API_KEY` — it's what the worker verifies ID tokens against):
  ```bash
  cd worker && npx wrangler secret put FIREBASE_WEB_API_KEY -c wrangler.hr-api.toml
  ```
- [ ] **[ME]** Verify KV binding `HR_KV` is live: `npx wrangler kv key list --binding HR_KV -c wrangler.hr-api.toml` (empty list is fine)
- [ ] **[YOU] After launch (§4):** tighten CORS — in `worker/wrangler.hr-api.toml` change `ALLOWED_ORIGINS = "*"` to your Pages origin (e.g. `https://hiretire.pages.dev`), then I redeploy. `*` is acceptable only because every route also requires a valid Firebase ID token, but least-privilege is better.
- [ ] **[ME]** Live check: unauthenticated `GET /sessions` must return **401** (proves the auth guard), and an authenticated request from the app must return **200**

---

## 3 · Cloudflare Pages — the website itself

- [ ] **[ME]** Push the repo to GitHub: `git push -u origin main` (needs your GitHub auth once)
- [ ] **[YOU]** `Workers & Pages → Create → Pages → Connect to Git` → pick the repo
  - Build command: `npm run build`
  - Build output: `dist`
  - Production branch: `main`
- [ ] **[YOU]** `Settings → Environment variables (Production)` → add **all 7** `VITE_*` values from the table at the top:
  - 6 Firebase values: `Project Settings → General → Your apps → Web app → SDK setup and configuration` (copy verbatim)
  - `VITE_AI_PROXY_URL` = your nvidia-proxy URL from §2.1
- [ ] **[YOU]** Click **Save and Deploy**. Note the resulting domain (e.g. `hiretire.pages.dev`) → **do step 1.2 now** if you haven't.
- **[ME]** Can automate the equivalent via `wrangler pages project create hiretire --production-branch main && npx wrangler pages deploy dist` if you'd rather skip the dashboard.
- [ ] **[YOU] Custom domain (optional):** `Pages → your project → Custom domains → Set up a custom domain` → add your domain → add the CNAME record at your registrar → wait for the ✓ Active certificate → **then add the same domain to Firebase authorized domains (§1.2)**.

> ⚠️ Do **not** add any `VITE_HIJACK_AUTH_EMULATOR` variable to Pages — the prod build must never know about the emulator. It isn't in the repo's env files; keep it that way.

---

## 4 · Post-deploy verification (30 minutes, in order)

Run on the **live domain**, signed in with a real (non-emulator) account:

- [ ] **[ME]** Google sign-in: click **Continue with Google** → popup shows Google account chooser → completes to onboarding. If it errors: 99% it's §1.2 (domain) or §1.1 (provider off) — check the browser console for `auth/unauthorized-domain`.
- [ ] **[ME]** Email signup → verification email arrives → "✓ Sent!"/banner states work
- [ ] **[ME]** Student flow: upload 2–3 resumes → parse → readiness score renders
- [ ] **[ME]** HR flow: upload resumes → Process & Rank → local engine returns ranked results in seconds → leaderboard/kanban render
- [ ] **[ME]** Cloud sync: create an HR session → sign in on a second device/browser → session list shows it (`GET /session/:id` → 200 in `wrangler tail hr-api`)
- [ ] **[ME]** CSV export downloads with all candidates
- [ ] **[ME]** Account → Delete account removes the user and clears cloud data (`POST /account/delete` → 200)
- [ ] **[ME]** `npx wrangler tail nvidia-proxy --format pretty` shows no auth/5xx errors during the runs above
- [ ] **[ME]** Contrast sweep on the live domain: `fetch("/ui-sweep.js").then(r=>r.text()).then(eval)` on key routes → 0 failures expected

---

## 5 · If something breaks

| Symptom | Likely cause | Fix |
|---|---|---|
| Google popup: `auth/unauthorized-domain` | Domain missing in Firebase | §1.2 — add the exact origin (scheme + host, no path) |
| Google popup: 400 / `Operation not allowed` | Provider disabled | §1.1 — enable Google, set support email |
| AI features error | Missing worker secret | §2.1 — `wrangler secret put` again, redeploy |
| HR sessions don't sync | hr-api secret/KV or CORS | §2.2 — check `wrangler tail hr-api`; expect 401 without token, 200 with |
| Everything works but AI is slow | Free NVIDIA endpoint latency | Expected — local scoring is the default engine; AI is opt-in |
| Sessions stale after code changes | Browser kept old bundle | Hard refresh; Pages redeploys are atomic |

**Rollback:** any prior deploy is one click away — `Pages → Deployments → … → Rollback to deployment`. Workers: redeploy the previous commit (`git checkout <sha> && npx wrangler deploy`).
