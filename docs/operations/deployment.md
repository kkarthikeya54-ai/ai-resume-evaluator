# Deployment

> 🛠️ Operations · Prev: [Configuration](./configuration.md) · Next: [Troubleshooting](./troubleshooting.md)

Four independently deployable pieces. Recommended order: **secrets → worker → functions → rules → frontend**.

## 1. AI Worker (Cloudflare)

```bash
cd worker
wrangler login
wrangler secret put GEMINI_API_KEY     # primary provider
wrangler secret put NVIDIA_API_KEY     # fallback (optional)
wrangler deploy                        # prints the *.workers.dev URL
```

Put that URL into `.env` as `VITE_AI_PROXY_URL`. (`worker/README.md` walks the same steps.)

## 2. HR API Worker (Cloudflare) — the active HR backend

```bash
cd worker
wrangler deploy -c wrangler.hr-api.toml
wrangler secret put FIREBASE_WEB_API_KEY -c wrangler.hr-api.toml   # token verification
```

The KV namespace binding (`HR_KV`) lives in `wrangler.hr-api.toml`. Replaces the Cloud Functions HR endpoints, which can no longer be deployed (Blaze required). Details: [Backend → HR API Worker](../backend/hr-api.md).

## 3. Cloud Functions (Firebase) — legacy

```bash
firebase functions:secrets:set NVIDIA_API_KEY
firebase deploy --only functions
```

> ⚠️ **Deploys fail on the free Spark plan** (Blaze required) — skip this step unless you're on Blaze. HR sync no longer depends on it.

**Client-visible CORS fixes only take effect after a redeploy** — the single most common "why is cloud sync still failing" answer for legacy deployments (see [Troubleshooting](./troubleshooting.md)).

## 4. Security rules

```bash
firebase deploy --only firestore:rules,storage
```

## 5. Frontend (static)

```bash
npm run build        # → dist/ (patched pdfjs worker; no PWA)
```

`dist/` is a static SPA. The live host is **Vercel** (`vercel.json` adds the SPA rewrite to `/index.html` + cache headers); Firebase Hosting, Cloudflare Pages, or any static host **with SPA fallback** to `/index.html` also works.

Pre-deploy gate: `npm test && npm run lint && npm run test:ui && npm run build` — see [Quality Gates](../testing/quality-gates.md).

## Deploy-order gotchas

| Symptom | Cause | Fix |
| --- | --- | --- |
| AI calls 401/403 after worker deploy | Secret not set before deploy | `wrangler secret put` → redeploy |
| Cloud sync CORS errors after frontend deploy | Legacy Functions (with the CORS fix) not redeployed — or the HR API Worker isn't deployed | Deploy the [HR API Worker](../backend/hr-api.md) (`wrangler deploy -c wrangler.hr-api.toml`); legacy path: `firebase deploy --only functions` |
| HR sync 401 Unauthorized | Worker's `FIREBASE_WEB_API_KEY` secret missing/expired | `wrangler secret put FIREBASE_WEB_API_KEY -c wrangler.hr-api.toml` → redeploy |
| PDF parsing works locally, breaks in prod | Build-time worker patch missing | Verify `dist/assets/pdf.worker.*.mjs` contains the polyfill preamble; rebuild |
| Stale shell after deploy | A service worker from the **earlier PWA version** is still registered | `src/main.jsx` unregisters stale service workers on boot; if symptoms persist, hard-refresh / clear site data once |

---

**Related pages:** [Configuration](./configuration.md) · [HR API Worker](../backend/hr-api.md) · [Cloud Functions](../backend/cloud-functions.md) · [Worker Proxy](../backend/worker-proxy.md) · [Security Rules](../backend/security-rules.md)
