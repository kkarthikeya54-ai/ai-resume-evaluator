# Profile & Backend Client

> ⚙️ Services · Prev: [Storage](./storage.md)

## `userProfile.js` — Firestore `users/{uid}`

| Export | Purpose |
| --- | --- |
| `DEFAULT_PROFILE` | The canonical profile shape: basic info, `socialLinks`, `academicDetails` (student), `hrDetails` (recruiter), `stats` |
| `loadUserProfile(uid)` | Deep-merges stored data over defaults — nested objects too, so new fields appear without migration |
| `saveUserProfile(uid, profile)` | Merge-write with `serverTimestamp()` |
| `recordEvaluation(uid, score, breakdown)` | After each fresh readiness evaluation: increments `totalEvaluations`, tracks `topScore`, computes `rankTier` (S+ ≥90 … D <50), and maps AI breakdown keys onto 4 normalized sub-skill percentages via alias matching (`technicalSkills`, `projectsExperience`, `educationCerts`, `atsCompatibility`) |

The alias matching is deliberately forgiving — the AI's breakdown keys vary slightly between runs; `recordEvaluation` maps them onto stable stat fields (see the `keyMap` in the source).

## `hrBackend.js` — HR cloud client (Cloudflare Worker)

Cloud backend for HR sessions: the free-tier Cloudflare Worker [`worker/hr-api.js`](../backend/hr-api.md) (deployed at `https://hr-api.kkarthikeya54.workers.dev`) with Workers KV storage. This **replaced** the Firebase Cloud Functions backend, which can no longer be deployed (Blaze required for Cloud Functions) and whose stale deployment rejected cross-origin calls.

- Base URL: hard-coded `HR_API_BASE` — no `VITE_*` variable needed anymore.
- `functionsEnabled()` — gates callers so local-only mode is silent and fine (true whenever Firebase auth is initialized).
- `request(path, {method, body})` — attaches `Authorization: Bearer <Firebase ID token>` (the worker verifies it server-side and scopes every KV key to the caller's uid), JSON-encodes bodies, surfaces structured `{error}` response bodies as messages.
- Worker-side CORS handles `PUT`/`PATCH` preflights correctly, so cross-origin sync works.

| Export | HTTP | Server handler |
| --- | --- | --- |
| `saveHrSession({id, name, role, payload})` | `PUT /session/:id` | [HR API Worker](../backend/hr-api.md) |
| `fetchHrSession(sessionId)` *(new)* | `GET /session/:id` | full record — used for **multi-device recovery** |
| `listHrSessions()` *(new)* | `GET /sessions` | summaries only (no payloads) |
| `deleteHrSession(sessionId)` *(new)* | `DELETE /session/:id` | removes record + index entry |
| `updateCandidateStatus(sessionId, candidateId, status)` | `PATCH /session/:sid/candidate/:cid` | validates status against the allowed set |
| `exportHrSessionCsv(sessionId)` | *(no endpoint)* | fetches the session and builds the CSV **client-side** with `generateCandidatesCsv` (same generator as the local Export CSV button) |
| `deleteUserAccount()` | `POST /account/delete` | purges all KV sessions for the caller (the Firebase Auth record itself is deleted separately by the Account page) |

**Call pattern:** every call site is wrapped like:

```js
if (functionsEnabled()) {
  try { await saveHrSession(...) }
  catch (err) { console.warn("[Backend] … failed:", err.message) }
}
```

Local IndexedDB remains the source of truth; the cloud is a best-effort mirror — **plus** a recovery source: HrDashboard now pulls the full session from the cloud (and caches it locally) when a session id from another device isn't found on this one. Backend downtime still never blocks the UX (see [Operations → Troubleshooting](../operations/troubleshooting.md)).

---

**Related pages:** [HR API Worker](../backend/hr-api.md) · [Storage](./storage.md) · [Data & Privacy](../data-and-privacy/README.md)
