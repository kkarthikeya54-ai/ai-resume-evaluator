# Design System

> 🖥️ Frontend · Prev: [Components](./components.md) · Next: [Motion & Loading](./motion-and-loading.md)

A single fixed brand palette (light royal-blue/white — historically "ivory/pine") applied app-wide through CSS custom properties. No runtime theme switcher — the tokens are static and one palette governs landing, auth, student, HR, and legal surfaces.

## Color palette

| Role | Hex | Usage |
| --- | --- | --- |
| Ivory (page bg) | `#F7FAFF` | App background, `index.html` `theme-color`, Velaris `bg` |
| Card | `#FFFFFF` | Cards, table surfaces, wells |
| Card hover | `#EFF4FF` | Hover fills, tinted wells |
| Pine (text) | `#0B1F3A` | Primary text, headings |
| Muted | `#5A6C8C` | Secondary text, captions |
| Royal blue (primary) | `#1D6FF2` | Brand primary (500), highlights, buttons |
| Royal blue deep (buttons) | `#1257C4` (600) / `#0F47A0` (700) | Primary buttons — **white text on `#1D6FF2` passes WCAG AA (4.56:1)** |
| Sky (accent) | `#2563EB` (600) | Accents, "done" states, secondary buttons, links |
| Gold | `#A16207` (300/400 text) · `#D09406` (500) | shortlist stars, warnings, mid-band scores |

## Token layers (`src/index.css`)

1. **Root `:root` variables** — the static palette: `--ivory` (`#F7FAFF`), `--pine` (`#0B1F3A`), `--pine-deep`, `--sage` (`#5B8DEF`), `--coral` (`#1D6FF2`) + soft alpha variants. Plus the **`--theme-*` layer** that everything actually consumes: `--theme-bg`, `--theme-card`, `--theme-card-hover`, `--theme-text`, `--theme-text-muted`, `--theme-border`, `--theme-primary*`, `--theme-accent*`, and `--theme-rgb-primary/accent` for alpha-composited glows. The variable names are the residue of the removed multi-theme system; hundreds of `var(--theme-*)` usages now map onto this one palette.
2. **Tailwind v4 `@theme` block** — generates utility scales: `--color-primary-50…900` (royal blue), `--color-accent-50…900` (sky), `--color-shortlist-*` (gold), `--color-card`, `--color-card-hover`, `--color-border`, `--color-bg-main`. So `bg-primary-600`, `text-shortlist-300`, `border-accent-200` all resolve to brand colors.

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

- **Contrast:** AA on all surfaces; primary buttons verified at 4.56:1 (white on `#1D6FF2`).
- **Keyboard:** focus traps + Escape + focus restore in every modal (`useFocusTrap`); visible focus rings via token styling.
- **Screen readers:** aria-labels on icon-only controls (shortlist star, checkboxes, select menus); `role="img"` + `<title>` on the architecture SVG.
- **Motion:** global `prefers-reduced-motion` collapse (see [Motion & Loading](./motion-and-loading.md)).
- **Privacy UX:** cookie consent, email-verification gates, `noindex` on private pages.

## PWA? No — deliberately removed

The app **is not a PWA**: no manifest, no Workbox, no service worker. The earlier PWA build (standalone `#0A1F1C` theme, precached shell) was removed because stale service workers caused "Failed to fetch dynamically imported module" errors after deploys. `src/main.jsx` now proactively **unregisters** any service worker left over from that era. `vite-plugin-pwa` remains in `package.json` as a vestigial devDependency but is no longer loaded in `vite.config.js`.

---

**Related pages:** [Motion & Loading](./motion-and-loading.md) · [Components](./components.md) · [Reference → Tech Stack](../reference/tech-stack.md)
