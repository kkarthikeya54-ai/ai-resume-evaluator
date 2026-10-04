# HR API Worker (`worker/hr-api.js`)

> ☁️ Backend · Prev: [Cloud Functions](./cloud-functions.md) · Next: [Security Rules](./security-rules.md)

The Cloudflare Worker that now serves **all HR cloud sync** — the replacement for the four HR Cloud Functions (`saveHrSession`, `updateCandidateStatus`, `exportHrSessionCsv`, `deleteUserAccount`), which can no longer be deployed (Firebase requires the Blaze plan for Cloud Functions). Same auth model, new transport: free Cloudflare plan + **Workers KV** storage.

Client side: `services/hrBackend.js` ([Profile & Backend Client](../services/profile-and-backend.md)).

## Why the migration happened

| Constraint | Cloud Functions | HR API Worker |
| --- | --- | --- |
| Deploy plan | **Blaze required** (Spark can no longer deploy) | Free Workers plan |
| Storage | Firestore | Workers KV (free tier) |
| CORS | Stale deployment rejected `Authorization`/`PUT/PATCH` preflights | Handled correctly, including preflights |
| Cold starts | Possible | None (V8 isolates at the edge) |

## Storage model (Workers KV)

Keys are scoped by Firebase UID, so ownership is enforced **by construction** — a session can only ever be read or written through its owner's key:

```
hr:sessions:<uid>                → JSON array index of session records
hr:session:<uid>:<sessionId>     → single session record
                                   { id, uid, role, name, createdAt, updatedAt, payload }
```

- Every KV write carries `expirationTtl` = **1 year of inactivity** (each upsert refreshes it).
- KV's value cap is 25 MiB. `MAX_BODY_BYTES = 24 MiB` is **defined** in the worker but not currently enforced; instead the *client* strips raw file bytes before mirroring (`slimPayloadForCloud` drops `fileData[].bytes` and blob `url`), so sessions stay small (metadata + scores only) and the 25 MiB cap is never approached.
- `payload.candidates[].status` values are normalized to the allowed set (`screened`, `shortlisted`, `interviewing`, `hired`, `rejected`) on write — same validation the functions did, extended with `rejected` for the pass-rate column. `PATCH` validates against the same set and answers `400` (listing it) for anything else.

## Auth

No service account. The client forwards the **Firebase ID token** as `Authorization: Bearer …`; the worker validates it server-side against the Identity Toolkit endpoint:

```
POST https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=<WEB_API_KEY>
     { idToken: <ID token> }
```

A valid token returns the user record (including `localId` = uid); anything else is a `401`. Every route below the auth check derives all KV keys from that uid — there is no way to address another user's data. (Trade-off vs `verifyIdToken`: one extra upstream round trip per request, but zero admin credentials to manage.)

Configuration: `FIREBASE_PROJECT_ID` and `ALLOWED_ORIGINS` are plaintext `[vars]` in `worker/wrangler.hr-api.toml`; `FIREBASE_WEB_API_KEY` is a **secret** (`wrangler secret put FIREBASE_WEB_API_KEY`).

**Behavioral tests:** `node scripts/_hr_worker_test.mjs` drives the real `fetch()` with an in-memory KV stub and a stubbed token check — 4 tests covering the `rejected` allow-list regression (saves no longer reset rejected candidates to `screened`, drags no longer 400) plus the unknown-status guards.

## Endpoints

| Method + path | Replaces | Behavior |
| --- | --- | --- |
| `GET /sessions` | *(new)* | Summaries of the caller's sessions: `{id, name, role, createdAt, updatedAt, candidateCount}` — no payloads |
| `GET /session/:id` | *(new)* | Full session record (`404` if absent/corrupt). Drives multi-device recovery |
| `PUT /session/:id` | `saveHrSession` | Upsert; preserves the original `createdAt`, stamps `updatedAt`, maintains the index entry |
| `PATCH /session/:id/candidate/:cid` | `updateCandidateStatus` | Validates status ∈ allowed set, patches that candidate, writes back |
| `DELETE /session/:id` | *(new)* | Removes the record **and** its index entry |
| `POST /account/delete` | `deleteUserAccount` | Deletes every session + the index for the caller (KV has no auth-record concept — the Firebase Auth record itself is untouched) |

Unknown routes → `404`; handler errors → `500 {error}`. Every response carries CORS headers; `OPTIONS` preflights are answered `204` before auth runs.

## CORS

`corsHeaders(request, env)` echoes the `Origin` only when it is in the `ALLOWED_ORIGINS` allowlist (comma-separated; `*` allows all — currently `*`, since every route still requires a valid token). Methods `GET, PUT, PATCH, POST, OPTIONS`, headers `Content-Type, Authorization`, `Access-Control-Max-Age: 86400`. This is why the client's `PUT`/`PATCH` calls now pass preflight where the stale Cloud Functions deployment rejected them.

## Client contract (what changed for callers)

| Client export | Calls |
| --- | --- |
| `saveHrSession({id, name, role, payload})` | `PUT /session/:id` |
| `fetchHrSession(sessionId)` *(new)* | `GET /session/:id` → `session` |
| `listHrSessions()` *(new)* | `GET /sessions` |
| `deleteHrSession(sessionId)` *(new)* | `DELETE /session/:id` |
| `updateCandidateStatus(sid, cid, status)` | `PATCH /session/:sid/candidate/:cid` |
| `exportHrSessionCsv(sessionId)` | *(no endpoint)* — fetches the session and builds the CSV client-side with the existing `generateCandidatesCsv` |
| `deleteUserAccount()` | `POST /account/delete` |

The base URL is hard-coded in `hrBackend.js` (`HR_API_BASE`); no `VITE_*` variable is needed (see [Configuration](../operations/configuration.md)).

## Deploy

```bash
cd worker
wrangler deploy -c wrangler.hr-api.toml
wrangler secret put FIREBASE_WEB_API_KEY -c wrangler.hr-api.toml   # if not set yet
```

The KV namespace binding (`HR_KV`) and its id live in `wrangler.hr-api.toml`. Verify with an unauthenticated request — it must return `401`, which proves the token check is active before you point the client at it.

---

**Related pages:** [Cloud Functions](./cloud-functions.md) (legacy twin) · [Security Rules](./security-rules.md) · [Services → Profile & Backend Client](../services/profile-and-backend.md) · [Operations → Deployment](../operations/deployment.md)
