# UI Regression Checklist — Blue/White Theme

Permanent regression checklist for the two bug classes that have shipped twice
in this app: **invisible text after the dark→light retheme** (white-on-white /
light-gold-on-white) and **hover states that erase the label**. Every fix below
is a real bug this sweep caught and repaired — treat new violations as release
blockers.

## Why this exists

The blue/white retheme changed every surface to light (white cards, tinted
chips, blue accents). Dozens of components still carried dark-theme classes:
`text-white` headings, `hover:text-white` buttons, and light `-200`/`-300`
text tokens (`text-red-300`, `text-shortlist-300`, `text-emerald-300`, …)
painted on light tint backgrounds at 1.0–2.5:1 contrast. The VerifyGateModal
buttons (the original report) were literally invisible on hover.

## The two tools

| Tool | Where it runs | What it catches |
|---|---|---|
| **`npm run test:ui`** | CI / terminal, static | Source-level regressions: light `-200`/`-300` text tokens anywhere in `src/`; `hover:text-white` without a solid dark hover background |
| **`public/ui-sweep.js`** | Browser console on any route | Live computed contrast of every visible button/link/text node incl. hover rules (WCAG math, ≥3:1 gate), background-clip:text, active pills, gradients, `color-mix()` |

### Running the live sweep

1. Start the dev server (`npm run dev`) and open any route in the preview.
2. Open DevTools console and paste the entire contents of `public/ui-sweep.js`.
3. Read the summary line: `PASS` requires **0 failures** at ≥3:1 contrast.
4. Results also land on `window.__sweepResults` for automation.

For the app's own verification runs, fetch + eval it:
`fetch("/ui-sweep.js").then(r=>r.text()).then(eval)` — returns the summary.

## Route coverage (checked this session — repeat after theme changes)

| Route / surface | Result |
|---|---|
| `/` landing | PASS (7 interactive, 17 text) |
| `/login`, `/signup` | PASS |
| `/hr` workspace (results, 500-candidate session) | PASS (36 interactive, 29 hover, 68 text) |
| `/hr` Pipeline (Kanban) view | PASS |
| Compare modal (2 candidates) | PASS (40 interactive, 122 text) |
| `/account` all tabs + Delete modal | PASS |
| `/app` student page + verification banner | PASS |

## Fixed this session (do not regress)

- **~30 call sites** across 22 files: `text-red-300/200`, `text-emerald-300`,
  `text-shortlist-300`, `text-amber-300/200`, `text-blue-300/200` →
  `text-red-700`, `text-shortlist-700`, `text-blue-700`, `text-primary-600/700`,
  `text-emerald-700` (4.5:1+ on white/tint backgrounds).
- **VerifyGateModal** hover states: Continue = navy on light-blue tint (7:1),
  Send = white on blue (6.6:1), Cancel = navy on white (16.5:1).
- **Account delete modal** disabled state: was `bg-white/20 text-white`
  (invisible); now muted navy ghost, still exempt from the sweep (WCAG exempts
  disabled controls).
- **ViewSwitch segmented control** (Ranked List/Pipeline): white label painted
  over a child gradient pill — now correctly measured, not a false failure.
- **`.ht-gilt` champion name**: gradient `background-clip:text` — exempted
  (its color comes from background-image, not `color`).

## Harness semantics (public/ui-sweep.js)

- Skips `disabled` controls (WCAG 1.4.3 exemption) and background-clip:text.
- Resolves Tailwind v4 `oklch/oklab` and `color-mix(in …, X%, transparent)`.
- Walks ancestors compositing translucent layers; probes absolutely-positioned
  child/sibling "pill" spans that paint a control's background.
- Extracts every `:hover` stylesheet rule matching the element's hover classes
  and computes the hover-state ratio; ignores `.dark`-scoped rules.

## Rule of thumb for new code

On this light theme: **text on tinted surfaces uses `-700`/`-800`; text on
solid primary uses `white`.** If you reach for a `-200`/`-300` text token,
you are reintroducing the invisible-text bug — `npm run test:ui` will block it.
