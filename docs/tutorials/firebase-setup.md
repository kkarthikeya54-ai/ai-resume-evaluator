# Firebase Setup

> 🧰 Tutorials · Next: [Get the API Keys](./get-api-keys.md)

How to create the Firebase project this app runs on (auth + profile storage),
and the console steps that only you can do. The app treats Firebase as
**optional**: without it, everything degrades safely to a no-cloud mode
(auth buttons explain configuration is missing; resumes stay fully local).

## 1 · Create the project (free Spark plan)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
   - Name it whatever you like (this repo's convention is `ai-driven-resume-evaluator`).
   - **Analytics is optional** — you can decline it; the app never uses it.
   - The **Spark (free) plan** is enough. Cloud Functions deploys need Blaze,
     but nothing in the active stack uses Cloud Functions anymore (see
     [Backend → Cloud Functions](../backend/cloud-functions.md)).
2. From the project's home page, click **Add app → Web** (**`</>`**).
   - The config snippet contains exactly the six values the app needs.
   - You do **not** need to install the Firebase SDK — the app already has
     `firebase` installed; you're only copying the *config values*.

## 2 · Copy the web config into `.env`

From **Project Settings → General → Your apps → Web app → SDK setup and
configuration**, copy these six values into your root `.env` (names only —
see [Operations → Configuration](../operations/configuration.md)):

| Variable | Copy from the Firebase snippet |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

> ⚠️ These six values are **public by design** — they're compiled into the
> browser bundle. Web API keys are identifiers, not secrets; the real
> protection is the [Security Rules](../backend/security-rules.md), so never
> ship a project whose rules are open.

`config/firebase.js` only initializes the app when **all six** are present and
non-placeholder. If any value is still `your-…`, the app runs in no-cloud mode.

## 3 · Enable sign-in providers

**Authentication → Sign-in method**:

- [ ] **Email/Password** → enable.
- [ ] **Google** → enable, and set a **Support email** (required by Google).
      This is the #1 cause of "Google login returns 400" — a Google provider
      without a support email silently fails.

Nothing else is needed — no LinkedIn, no phone, no Facebook.

> Google sign-in uses the **popup** flow (`signInWithPopup`). Popups need
> cross-site cookies and third-party pop-ups, which ad blockers and privacy
> settings (Firefox Enhanced Tracking Protection, Safari ITP) can break.
> Email/password is fully first-party and always works. The app ships a
> dedicated error message for this case via `utils/authErrors.js`
> (`PRIVACY_HINT`) — see [Services → Auth & Role](../services/auth-and-role.md).

## 4 · Add authorized domains

**Authentication → Settings (gear) → Authorized domains**:

- `localhost` must stay (it's what keeps `npm run dev` working).
- Add the domain you deploy the frontend to (e.g. your Vercel app's
  `*.vercel.app` URL, plus any custom domain once it resolves). Missing
  domains are what cause `auth/unauthorized-domain` errors in the Google popup
  after a deploy.

## 5 · Enable Firestore + deploy security rules

The app writes user profiles to Firestore (`users/{uid}` via
`services/userProfile.js`), so the database must exist and the rules must be
locked down.

```bash
npm install -g firebase-tools        # once
firebase login                       # interactive; only you can do this
firebase deploy --only firestore:rules,storage
```

This repo's rules (`firestore.rules`, `storage.rules`) are least-privilege
already:

- Firestore `users/{uid}` — the signed-in user reads/writes only their own doc.
- Firestore `hr_sessions/{id}` — legacy (HR sync lives in the worker's KV),
  owner-only.
- Storage `resumes/{uid}/…` — owner-only. Note: resume **files** now go to
  **Supabase Storage** when configured (see
  [Configure the APIs → Supabase Storage](./configure-apis.md#supabase-storage));
  the Firebase Storage rules protect the legacy `cloudResumeStorage` path only.

> `firebase deploy` for Cloud **Functions** fails on the Spark plan (Blaze
> required) — that's expected and fine; nothing active depends on Functions
> anymore.

## 6 · Optional: local emulator (dev only)

For end-to-end verification runs you can point the app at the Firebase Auth
emulator by setting `VITE_HIJACK_AUTH_EMULATOR` in your **dev** shell. This is
wired through `vite.config.js` + `src/config/authEmulatorDev.js` and is
**inert in every normal dev/build** — never set it in production env vars.

---

**Related pages:** [Get the API Keys](./get-api-keys.md) · [Operations → Configuration](../operations/configuration.md) · [Backend → Security Rules](../backend/security-rules.md) · [Services → Auth & Role](../services/auth-and-role.md)