# Design System

> 🖥️ Frontend · Prev: [Components](./components.md) · Next: [Motion & Loading](./motion-and-loading.md)

A single fixed brand palette (the landing's pine/coral/sage/ivory scheme) applied app-wide through CSS custom properties. No runtime theme switcher — the tokens are static and one palette governs landing, auth, student, HR, and legal surfaces.

## Color palette

| Role | Hex | Usage |
| --- | --- | --- |
| Pine (page bg) | `#0A1F1C` | App background, PWA `theme_color`, Velaris `bg` |
| Pine card | `#0D2622` | Cards, table surfaces |
| Pine deep | `#061412` | PWA `background_color`, deepest wells |
| Ivory (text) | `#FAF8F5` | Primary text, headings |
| Sage (muted) | `#9DB8AF` | Secondary text |
| Sage (accent) | `#7FA99B` | Accents, "done" states, secondary buttons |
| Coral (primary) | `#E85D3F` | Brand primary (500), highlights |
| Coral deep (buttons) | `#C7432A` (600) / `#B23E26` (700) | Primary buttons — **darkened so white text passes WCAG AA (4.92:1)** |
| Amber | `#FBBF24` scale (`shortlist-*`) | Warnings, mid-band scores, shortlist stars |

## Token layers (`src/index.css`)

1. **`--theme-*` runtime variables** — `--theme-bg`, `--theme-card`, `--theme-card-hover`, `--theme-text`, `--theme-text-muted`, `--theme-border`, `--theme-primary*`, `--theme-accent*`, plus `--theme-rgb-primary/accent` for alpha-composited glows. These are the static residue of the former multi-theme system: the variable names were kept so hundreds of `var(--theme-*)` usages map onto the single palette.
2. **Tailwind v4 `@theme` block** — generates utility scales: `--color-primary-50…900` (coral), `--color-accent-50…900` (sage), `--color-shortlist-*` (amber), `--color-card`, `--color-border`, `--color-bg-main`. So `bg-primary-600`, `text-shortlist-300`, `border-accent-200` all resolve to brand colors.

## Typography

- **Landing:** Inter Tight (Google Fonts) + Cabinet Grotesk (cdnfonts).
- **App UI:** Plus Jakarta Sans + Inter, self-hosted via `@fontsource` imports in `main.jsx` — no runtime font fetch for app pages.
- Typographic voice: heavy weights (`font-black`/`font-extrabold`), tight tracking on headings.

## Key utilities (beyond Tailwind defaults)

| Utility | Purpose |
| --- | --- |
| `.aurora`, `.dot-grid` | Ambient page decoration (onboarding) |
| `.modal-backdrop`, `.modal-card` | Shared modal shell + entrance animation |
| `.bar-grow` | Animated width-fill for score bars |
| `.success-check`, `.success-circle`, `.success-checkmark` | Onboarding completion animation |
| `.onboarding-slide` | Slide transition |
| `.docx-preview` | Styles for mammoth-rendered DOCX previews |

## Accessibility posture

- **Contrast:** AA on all surfaces; primary buttons verified at 4.92:1.
- **Keyboard:** focus traps + Escape + focus restore in every modal (`useFocusTrap`); visible focus rings via token styling.
- **Screen readers:** aria-labels on icon-only controls (shortlist star, checkboxes, select menus); `role="img"` + `<title>` on the architecture SVG.
- **Motion:** global `prefers-reduced-motion` collapse (see [Motion & Loading](./motion-and-loading.md)).
- **Privacy UX:** cookie consent, email-verification gates, `noindex` on private pages.

## PWA setup (`vite.config.js`)

- Manifest: standalone display, `theme_color #0A1F1C`, `background_color #061412`, SVG icon (`public/favicon.svg`).
- Workbox: precache app shell (`js/css/html/svg/woff2`), SPA `navigateFallback: /index.html`, auto-update on deploy, 5 MB per-asset cap, outdated-cache cleanup.
- Result: installable; opens offline to the shell (AI features need the network; local session data persists).

---

**Related pages:** [Motion & Loading](./motion-and-loading.md) · [Components](./components.md) · [Reference → Tech Stack](../reference/tech-stack.md)
