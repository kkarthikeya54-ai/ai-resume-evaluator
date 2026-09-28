# Storage

> ⚙️ Services · Prev: [HR Pipeline & Copilot](./hr-pipeline.md) · Next: [Profile & Backend Client](./profile-and-backend.md)

Five modules cover persistence. Big picture: [Architecture → Data Flow](../architecture/data-flow.md) · Privacy table: [Data & Privacy → Data Inventory](../data-and-privacy/data-inventory.md).

## `sessionStore.js` — IndexedDB `airesume_sessions` (v1)

One object store keyed by session `id`. Records: `{id, uid, role, name, createdAt, updatedAt, payload}`.

| Export | Notes |
| --- | --- |
| `createSession(uid, role, name)` | Generates `ses_<ts>_<rand>` id, stamps timestamps |
| `listSessions(uid, role)` | Filters owner+role, sorted by `updatedAt` desc |
| `getSession(id)` | `null` on any failure (callers re-verify `record.uid === user.uid`) |
| `putSession(record)` | Stamps `updatedAt`; **quota-aware**: returns `{ok:true,…}` or `{ok:false, error:"quota"\|message}` by sniffing the IndexedDB error |
| `renameSession`, `deleteSession`, `deleteSessionsForUser` | Self-explanatory; all best-effort |
| `getStorageInfo()` | `navigator.storage.estimate()` → `{usage, quota}` (drives the HR usage meter) |
| `estimatePayloadBytes(payload)` | JSON size (excluding `bytes`) + file bytes + resume text |
| `formatBytes`, `createSessionId` | Helpers |

HR payloads embed `fileData[].bytes` (ArrayBuffers) so resume previews survive reloads **offline** — the reason sessions can get large (hence the quota plumbing).

## `hrStore.js` — legacy store + candidate cache

- IndexedDB `airesume_hr` (keyPath `uid`): the old single-session model, still read by SessionsPage for a one-time migration, then cleared (`loadSession`/`clearSession`).
- **sessionStorage** candidate cache: `saveCandidates`/`loadCandidates`/`clearCandidates` under `airesume_hr_candidates` — makes CandidateView instant within a tab; HrDashboard and CandidateView keep it in sync.

## `localResumeStorage.js` — default student store (localStorage)

- `saveResume(file, uid, onProgress)` — stores the file as an in-memory blob URL + metadata in `airesume_resume_metadata`; smooths a simulated progress curve for UX.
- `saveResumeText(uid, text)` / `getResume(uid)` / `removeResume(uid)` — `airesume_resume_text_<uid>`; removal revokes blob URLs.

## `cloudResumeStorage.js` — optional cloud path (Firebase)

Same interface, backed by Storage + Firestore: resumable uploads (`uploadBytesResumable`) with real progress, download URLs, `resumes/{uid}` metadata docs, owner-only rules.

## `resumeStorage.js` — the facade

Re-exports the **local** implementation as the active storage. Flipping the whole app to cloud storage is a one-line change here — every consumer imports from this facade.

## `dataWipe.js` — the "forget me" path

```js
wipeUserData(uid) → Promise.allSettled([
  removeResume(uid), deleteSessionsForUser(uid),
  clearHrSession(uid), clearCandidates(), clearGeminiCache()
])
```

`allSettled` — one failing store never blocks the rest. Called by role switch (AuthContext) and available for account deletion.

## `storageUtils.js`

`formatBytes` — the single shared byte formatter (both storage modules re-export it; tested in `storageUtils.test.js`).

---

**Related pages:** [Data & Privacy → Deletion Paths](../data-and-privacy/privacy-and-deletion.md) · [Profile & Backend Client](./profile-and-backend.md) · [Architecture → Data Flow](../architecture/data-flow.md)
