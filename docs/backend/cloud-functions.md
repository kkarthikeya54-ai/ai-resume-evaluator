# Cloud Functions (`functions/index.js`) — ⚠️ Legacy

> ☁️ Backend · Next: [HR API Worker](./hr-api.md) (the active HR backend) · [Worker Proxy](./worker-proxy.md)

> ⚠️ **Status: legacy.** Firebase now requires the Blaze plan to deploy Cloud Functions, so these can no longer be deployed from a fresh Spark-plan project — and the last-deployed copy rejected the client's cross-origin `PUT`/`PATCH` calls (CORS), breaking HR cloud sync. **HR session sync has moved to the [HR API Worker](./hr-api.md)** (Cloudflare + KV, free plan). The client's `hrBackend.js` no longer calls any of these functions except in legacy deployments; `analyzeResume` remains as an alternate AI path. The CORS fixes below are kept so a deployed copy behaves correctly if still used.

Firebase Functions **v2** (`onRequest` + `defineSecret`), Node 20 ESM, `firebase-admin` for Firestore + Auth with default app credentials.

## Shared machinery

- **`NVIDIA_API_KEY`** — `defineSecret` (set via `firebase functions:secrets:set`). Never in code or client env.
- **`ALLOWED_ORIGINS`** — env-config allowlist (default `*`). `corsHeaders(origin)` (fixed) echoes the origin **only when it is allow-listed** and sends **no** `Access-Control-Allow-Origin` header otherwise — previously a non-allowed origin got the literal string `"null"`, which every browser rejects. Methods `GET, POST, PUT, PATCH, OPTIONS` + headers `Content-Type, Authorization` are set together with a 24 h `Access-Control-Max-Age`, because the client always sends an Authorization header and uses PUT/PATCH. All five functions also pass `cors: true` to `onRequest` so the Firebase runtime itself answers preflights. *(Client-visible fixes take effect only after redeploying functions — see [Troubleshooting](../operations/troubleshooting.md).)*
- **Auth** — every endpoint verifies `Authorization: Bearer <ID token>` via `admin.auth().verifyIdToken` and works only with the caller's own `uid`.
- **Upstream protection** — slot system (`MAX_CONCURRENCY = 2`, `RATE_LIMIT_PER_SEC = 3`, FIFO queue), `MAX_RETRIES = 4` with exponential `backoffFor`, 30-minute server-side response cache keyed by `shortHash(model+prompt)`, `MAX_PROMPT_CHARS = 200000` cap.
- **`LLM_MODEL`** env selects the model (default: NVIDIA-hosted Llama 70B class).

## The five endpoints

### 1. `analyzeResume` — the AI proxy (Function flavor)
`POST { prompt, json? }` → verify auth → rate-limit → cache → call `https://integrate.api.nvidia.com/v1/chat/completions` with the secret → parse content (markdown-fence salvage) → `{ result }`.
This is the "keep the key in a Cloud Function" option; the Cloudflare Worker is the other (see [Worker Proxy](./worker-proxy.md)).

### 2. `saveHrSession` — `PUT /saveHrSession/:sessionId`
Auth → upsert `hr_sessions/{sessionId}` with `{uid, name, role, payload, updatedAt}`. Payload size cap enforced. Client calls it best-effort; local IndexedDB stays the source of truth.

### 3. `updateCandidateStatus` — `PATCH /updateCandidateStatus/:sessionId/:candidateId`
Validates `status` ∈ `{screened, shortlisted, interviewing, hired}`, loads the **caller's** session, patches the matching candidate, writes back.

### 4. `exportHrSessionCsv` — `GET /exportHrSessionCsv/:sessionId`
Loads the caller's session → streams a properly escaped CSV (`csvEscape`) of ranked candidates. Server-side twin of the client's `generateCandidatesCsv`.

### 5. `deleteUserAccount` — `POST /deleteUserAccount`
Deletes the caller's `users/{uid}` doc, their `hr_sessions`, then the Firebase Auth record (`admin.auth().deleteUser`) — real account erasure from the Account page. *(The worker replacement `POST /account/delete` purges only KV — the Auth record must still be deleted client-side; see [HR API Worker](./hr-api.md).)*

## Deploy (legacy path)

```bash
firebase functions:secrets:set NVIDIA_API_KEY
firebase deploy --only functions
```

> On the free Spark plan this deploy now fails — use the [HR API Worker](./hr-api.md) for HR sync instead.

Config: `firebase.json` pins the source dir and `nodejs20` runtime; `functions/package.json` declares `firebase-admin` + `firebase-functions`.

---

**Related pages:** [HR API Worker](./hr-api.md) · [Worker Proxy](./worker-proxy.md) · [Security Rules](./security-rules.md) · [Services → Profile & Backend Client](../services/profile-and-backend.md) · [Operations → Deployment](../operations/deployment.md)
