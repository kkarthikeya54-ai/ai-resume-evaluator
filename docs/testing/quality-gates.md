# Quality Gates

> 🧪 Testing · Prev: [Test Suites](./test-suites.md) · Next: [Verification Workflow](./verification.md)

Four gates must pass before any change is "done":

## 1. Tests — `npm test`

111 Vitest tests across 12 files (see [Test Suites](./test-suites.md)). A new pure function without a test is an unfinished change.

## 2. Lint — `npm run lint`

**oxlint** across 120+ files. Gate: **0 errors** (a small number of stylistic warnings is tolerated). `.oxlintignore` excludes generated/vendor paths.

## 3. UI audit — `npm run test:ui`

A static audit (`scripts/ui-regression.mjs`) over all **135 source files** that bans the invisible-text bug class the blue/white retheme has shipped before: light `-200`/`-300` text tokens on light surfaces, unscoped `hover:text-white`, and nonexistent palette classes. Details and the manual sweep checklist: [UI Regression](./ui-regression.md). Runs in ≈ 0.2 s.

## 4. Build — `npm run build`

The rolldown-based Vite build does more than bundle:

- **Module-graph check** — a missing export or broken import fails the build (this JS-only codebase has no separate typecheck; the build is it).
- **pdfjs worker patch check** — the emitted `dist/assets/pdf.worker.*.mjs` must contain the ES2026 polyfill preamble. Regression here silently breaks **all PDF parsing in production**.
- **No-PWA check** — the build must *not* emit a service worker or manifest; `src/main.jsx` unregisters stale workers from the pre-removal era.

## What "green" means

```
npm test        → 111 passed (12 files)
npm run lint    → 0 errors
npm run test:ui → 135 files audited, 0 violations
npm run build   → dist/ built, worker asset patched, no service worker
```

All four, plus a live walk of the affected flows ([next page](./verification.md)), is the definition of done used throughout this project's history.

---

**Related pages:** [Test Suites](./test-suites.md) · [Verification Workflow](./verification.md) · [Operations → Troubleshooting](../operations/troubleshooting.md)
