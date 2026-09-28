# Security Rules

> ☁️ Backend · Prev: [HR API Worker](./hr-api.md)

## Firestore (`firestore.rules`)

```
rules_version = '2';
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
match /hr_sessions/{sessionId} {
  allow read, write: if request.auth != null
    && (resource == null || resource.data.uid == request.auth.uid);
}
```

- `users/{uid}` — a user reads/writes **only their own** profile document.
- `hr_sessions/{id}` — owner-only on read/update/delete; `resource == null` allows the **create** case (ownership would be stamped by the legacy Cloud Function from the verified token, not from client data). Since the [HR API Worker](./hr-api.md) took over HR sync, this collection is legacy: the worker stores sessions in **Workers KV** under `hr:session:<uid>:<id>` / `hr:sessions:<uid>` keys, with ownership enforced by construction (every key is derived from the verified token's uid) rather than by rules.

`firestore.indexes.json` declares no composite indexes (no collection queries need them).

## Cloud Storage (`storage.rules`)

```
match /resumes/{userId}/{allPaths=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

Resume files are namespaced per user; no other principal can reach them.

## The authorization model, end-to-end

| Path | Protection |
| --- | --- |
| Client → Firestore/Storage directly | Security rules (owner-only, above) |
| Client → Cloud Functions (legacy) | `verifyIdToken` on every request + per-uid data access inside the handler (a caller can only ever touch `resource.data.uid == uid`) |
| Client → HR API Worker | Firebase ID token verified server-side (Identity Toolkit `accounts:lookup`); all KV keys are prefixed with the verified uid, so cross-user access is impossible by construction |
| Client → AI proxy | No user auth by design (prompt-only contract); upstream protected by slots/rate limits; the key never leaves the server |
| Role (`student`/`hr`) | **Not a security boundary** — it's a UI routing preference stored in localStorage. All data protection is uid-based, not role-based |

That last point matters: nothing in the cloud cares whether you're "HR" — both roles' data is protected by ownership alone, which is why role switching can safely wipe local data without cloud consequences.

## Known hardening ideas (documented, not implemented)

- The default `ALLOWED_ORIGINS = "*"` is convenient for dev; production should pin the deployed origins (both the functions config and the worker's `wrangler.hr-api.toml` var).
- `hr_sessions` create could add `request.resource.data.uid == request.auth.uid` validation for defense-in-depth.
- Consider app-check attestation on the AI proxy endpoints if the free tier is abused.

Deploy rules with `firebase deploy --only firestore:rules,storage`.

---

**Related pages:** [HR API Worker](./hr-api.md) · [Cloud Functions](./cloud-functions.md) · [Data & Privacy](../data-and-privacy/README.md) · [Operations → Deployment](../operations/deployment.md)
