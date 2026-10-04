# Verification Workflow

> 🧪 Testing · Prev: [Quality Gates](./quality-gates.md)

UI-facing changes are verified against the **running app**, not just compiled. The loop:

## The checklist

1. **Static gates first** — `npm test`, `npm run lint`, `npm run build` (see [Quality Gates](./quality-gates.md)).
2. **Register the dev server** (`npm run dev`, port 5173) and walk the real flows:
   - **Guest:** landing → demo modal → sequence → routed to `/signup`.
   - **Student:** login → `/upload` → real PDF → "Upload Complete" → Analyze → readiness score + skills-gap + roadmap render.
   - **HR:** login → onboarding (role switch if needed) → `/hr` → session → preset → multi-PDF upload → Process & Rank → ranked table → open a candidate report → copilot answers → move the **pass-rate** slider (candidates below it land in Rejected, restore sticks across reloads) → `/sessions` (interview date chip + calendar day chip + `Pass rate:` line).
3. **Skeleton assertions** — trigger a fresh AI run and confirm skeleton cards/rows mount (count `.skeleton-shiver` / `.skeleton-base`), and that cached sections skip skeletons.
4. **Interaction assertions** — cursor effects actually track (`--spot-x`/`--spot-y` respond to synthetic mousemove), Magnetic wraps the CTAs, stage meter flows then settles sky-blue.
5. **Console sweep** — no errors beyond the two known externals: AI-proxy retries under load and (on legacy deployments only) the Cloud Functions CORS warning.
6. **Accessibility spot-checks** — reduced-motion collapses animation; primary-button contrast ≥ 4.5:1; modals trap focus and restore it.
7. **Real-file E2E** — actual PDF resumes through the genuine File API + pdfjs path (a 500-file synthetic set exists for stress runs; use 2–5 files).
8. **Cleanup** — remove any test scaffolding (files in `public/`, temp plugins, polyfills) before finishing.

## Known pre-existing caveats (not regressions)

| Symptom | Cause | Status |
| --- | --- | --- |
| `saveHrSession` CORS error in console | Only with a stale/legacy Cloud Functions deployment; the current backend is the [HR API Worker](../backend/hr-api.md) with correct CORS | Documented in [Troubleshooting](../operations/troubleshooting.md) |
| "Verify your email first" gate on test accounts | Test accounts are unverified by design | Use "Continue anyway" |
| pdfjs "toHex is not a function" without shims | pdfjs 6 needs ES2026 APIs | The shims (app + worker) are load-bearing — see [Services → Parsing](../services/parsing.md) |

## Headless assertions when the UI can't be driven

For pure logic changes, a quick node script against the real module beats re-running the whole suite:

```bash
node -e "const m = require('./src/services/x'); console.log(m.fn(input))"   # quick probe
npx vitest run src/services/__tests__/x.test.js                             # targeted suite
```

---

**Related pages:** [Quality Gates](./quality-gates.md) · [Test Suites](./test-suites.md) · [Operations → Troubleshooting](../operations/troubleshooting.md)
