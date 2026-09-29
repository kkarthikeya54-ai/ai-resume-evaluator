# Auth & Role

> ⚙️ Services · Prev: [Layer Map](./layer-map.md) · Next: [Parsing](./parsing.md)

## `auth.js` — Firebase Authentication wrappers

| Export | Purpose |
| --- | --- |
| `subscribeToAuth(cb)` | Wraps `onAuthStateChanged`; safely calls `cb(null)` when Firebase isn't configured |
| `signUp({name,email,password})` | Creates the account, sets displayName |
| `logIn(email, password)` | Email/password sign-in |
| `logInWithGoogle()` | Popup sign-in with a shared `GoogleAuthProvider` |
| `logOut()` | Sign out (warns instead of throwing when unconfigured) |
| `resetPassword(email)` | Sends password-reset email |
| `sendVerificationEmail()` | Sends verification to `auth.currentUser`, then reloads the user so `emailVerified` refreshes |
| `getCurrentUser()` | Sync current-user accessor |

`requireAuth()` throws a helpful error when Firebase env vars are missing — the graceful no-cloud path. Every consumer of auth state lives behind [AuthContext](../architecture/routing-and-guards.md#authcontext-internals), which adds the stale-token check.

## `role.js` — the role model

- `ROLES = { STUDENT: "student", HR: "hr" }`.
- `getRole(uid)` / `setRole(uid, role)` / `clearRole(uid)` — persisted per-uid in `localStorage: airesume_role_<uid>`. Reads accept only the two canonical values (defends against tampered storage).
- `getRoleRedirect(role)` — `hr → /hr`, else `/app`. Used by the route guards, Login, Signup, Onboarding, and Account.

**Model note:** a user can *be* both — the role just decides the **default workspace** and what the guards admit. Switching roles wipes local workspace data (see [AuthContext](../architecture/routing-and-guards.md#authcontext-internals)).

## `utils/authErrors.js` — error localization

Maps Firebase auth error codes to human messages (`auth/invalid-credential` → "Invalid email or password.", `auth/unauthorized-domain` → "add this domain to Authorized domains", `auth/network-request-failed` → network hint, …). Login/Signup render these strings directly. Google popup failures get extra treatment in `getGoogleAuthErrorMessage()`: blocks (popup-blocked / cancelled) → clean message; **server/config codes** (`auth/unauthorized-domain`, `auth/if-invalid-origin`) → config message instead of the browser hint; genuinely unknown codes → privacy hint (`PRIVACY_HINT`) plus a `console.warn` with the raw error so the real code is never lost.

---

**Related pages:** [AuthContext internals](../architecture/routing-and-guards.md#authcontext-internals) · [Backend → Security Rules](../backend/security-rules.md) · [Profile & Backend Client](./profile-and-backend.md)
