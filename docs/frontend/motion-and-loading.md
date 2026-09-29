# Motion & Loading

> 🖥️ Frontend · Prev: [Design System](./design-system.md)

Three motion systems cover the app: **cursor-interactive effects**, **loading animations**, and **skeleton loaders for AI content**. All of them collapse under `prefers-reduced-motion` and stay off on touch devices.

## 1. Cursor-interactive primitives (`components/ui/`)

| Primitive | Effect | Used on |
| --- | --- | --- |
| `Magnetic.jsx` | Wrapped element translates toward the cursor (strength ~0.2) | HR Process CTA, student Run-All, Create Hiring Session |
| `TiltCard3D.jsx` | Perspective tilt (max ~10°) + soft glare (0.22 white) | Candidate header, CompareModal, HR result cards |
| `SpotlightCard.jsx` | Radial primary-blue glow follows the cursor via CSS vars `--spot-x/--spot-y` | HR ranked-table rows (per-row handler) |

**A11y gating (all three):** handlers activate only when `window.matchMedia("(pointer: fine)")` matches **and** reduced-motion is off. CSS side: hover affordances gated inside `@media (pointer: fine)`; `.spotlight-card::before` and `.tilt-glare` are `display: none` under reduced motion.

**Button sheen:** the Process CTA also carries a light sweep on hover (`group/btn` + `animate-btn-sheen`).

## 2. Loading animations

- **HR stage meter** (`.hr-stage-meter__bar`): flowing royal-blue gradient ribbon (`stage-flow` 1.8s loop) with animated width; **settles to sky `#2563EB` + static** when the run completes (`--done`).
- **Staggered entrance** (`.stagger-item`): fade-up cascade via inline `animation-delay` (120ms steps in stacks, 90ms in rows).
- **Ambient shiver** (`.skeleton-ambient` on `<html>`): while any skeleton is mounted, nearby live content breathes in sync — the page feels like it's "working".
- **Count-up numbers** (`useCountUp`): eased rAF count when scores scroll into view; instant under reduced motion.

## 3. Skeleton system (`components/Skeleton.jsx`)

| Primitive | Shape | Used for |
| --- | --- | --- |
| `SkeletonCard` | Icon dot + title bar + N text lines | Upload/analyze stages, route Suspense fallback |
| `SkeletonStack` | N staggered cards | One per AI section while generating |
| `SkeletonRows` | Table rows with rank chips | HR processing state (under the stage meter) |
| `SkeletonRibbon` | Inline bar | Score bars / meters during load |
| `SkeletonDonut` | Spinning conic-gradient ring + score bar | Readiness placeholder |

**Wiring contract (everywhere):** `loading && !data → skeleton`. Cached results never flash skeletons; already-loaded sections skip straight to content.

**Visual language:** `.skeleton-base` bars get an infinite **primary-blue shimmer sweep** (`skeleton-sweep`); card wrappers add the `.skeleton-shiver` sway so users read *generating*, not *broken*. The sweep uses `transform: translateX` only (compositor-friendly, no layout thrash).

## The reduced-motion contract

`index.css` ends with a single `@media (prefers-reduced-motion: reduce)` block that:
- hides spotlight/glare overlays,
- stops the sweep (bars become static at 55% opacity),
- stops shiver/stagger/stage-flow (stagger items render fully opaque immediately),
- and every JS-driven effect re-checks `matchMedia` at mount.

**Adding new motion:** follow the same two gates — a CSS `@media` clause **and** a `pointer: fine`/reduced-motion check in the component — otherwise the effect will leak to touch/reduced-motion users.

---

**Related pages:** [Design System](./design-system.md) · [Components](./components.md) · [AI Pipeline → Student Flow](../ai-pipeline/student-flow.md) (where skeletons meet data)
