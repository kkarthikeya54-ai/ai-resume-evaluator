# Routing & Guards

> 🏗️ Architecture · Prev: [Data Flow](./data-flow.md)

## Entry chain

1. **`index.html`** — SPA shell: meta/OG tags, fonts, `#root`, manifest link.
2. **`src/main.jsx`** — `StrictMode` → `ErrorBoundary` → `HelmetProvider` → `App`; imports self-hosted fonts + `index.css`.
3. **`src/App.jsx`** — router + chrome (details below).

## App.jsx responsibilities

- **`BrowserRouter`** → **`AuthProvider`** → routes; **Sonner `Toaster`** (top-center) for toasts.
- **Ambient layer:** the Velaris WebGL background renders `fixed z-0` on every page **except** `/`; page content sits in a `relative z-10` layer so text always paints above the ambient water. The landing runs its own full-screen 3D stage instead.
- **Code splitting:** heavy pages are `lazy()` (Landing, Upload, AppPage, HrDashboard, Sessions, CandidateView) behind a `Suspense` boundary whose fallback is two skeleton cards.
- `CookieConsentBanner` on all pages except the four legal pages.

## Route table

| Route | Guard | Page |
| --- | --- | --- |
| `/` | public | Landing (cinematic 3D) |
| `/login`, `/signup` | redirects signed-in users with a role | Login / Signup |
| `/onboarding` | `OnboardingRoute` | Onboarding |
| `/sessions` | `AuthRoute` | SessionsPage |
| `/account` | `AuthRoute` | Account |
| `/upload` | `StudentRoute` | UploadPage |
| `/app` | `StudentRoute` | AppPage |
| `/hr` | `HrRoute` | HrDashboard |
| `/candidate/:candidateId` | `HrRoute` | CandidateView |
| `/privacy`, `/terms`, `/refund`, `/cookies` | public | Legal pages |

## The guards (`components/RoleGuards.jsx`)

| Guard | Behavior |
| --- | --- |
| `ProtectedRoute` | No user → `<Navigate to="/login" replace>`; holds rendering while `loading` (prevents auth-flash) |
| `HrRoute` | Protected + role must be `hr`, else → `/app` |
| `StudentRoute` | Protected + role must **not** be `hr` (students and role-less users), else → `/hr` |
| `AuthRoute` | Protected only |
| `OnboardingRoute` | Already has a role → redirect to dashboard; else Protected |

Composition: `HrRoute`/`StudentRoute` wrap a shared `RoleGuard` over `ProtectedRoute` — one nested component each, easy to extend.

## AuthContext internals (`context/AuthContext.jsx`)

Exposes `{ user, role, loading, logout, setRole, switchRole, isConfigured }`.

- **Auth state:** subscribes via `services/auth.js#subscribeToAuth`; role comes from `services/role.js` (per-uid localStorage, canonical-value validated on read).
- **Stale-token hygiene:** on every auth event the provider force-refreshes the ID token (`getIdToken(true)`). If refresh fails (revoked, disabled, orphaned session), it signs out cleanly so downstream `Bearer` calls never run on an expired credential.
- **`setRole(next, uid?)`** — persists role, updates state (used by Onboarding).
- **`switchRole(next)`** — wipes **all** local user data first (`dataWipe#wipeUserData`: resume text, sessions, HR store, candidate cache, AI cache), then sets the role. Intentional: the two workspaces have incompatible data shapes.
- Sets `document.documentElement.dataset.theme` to the active role.

## URL state conventions

| Param | Used by | Meaning |
| --- | --- | --- |
| `?session=<id>` | `/app`, `/hr`, `/upload`, `/candidate/:id` | Which session is open; pages verify `record.uid === user.uid` before using it |
| `?tab=<id>` | `/candidate/:id` | Active report tab (URL-replaceable so back/forward works) |

---

**Related pages:** [Pages](../frontend/pages.md) · [Services → Auth & Role](../services/auth-and-role.md) · [Backend → Security Rules](../backend/security-rules.md) · [Data Flow](./data-flow.md)
