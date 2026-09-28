# Tech Stack

> 📖 Reference

## Runtime dependencies

| Package | Version | Purpose | Where used |
| --- | --- | --- | --- |
| **react / react-dom** | ~19.2 | UI framework | everywhere |
| **react-router-dom** | ^7.18 | Routing, URL params, `<Navigate>` guards | `App.jsx`, all pages |
| **firebase** | ^12.17 | Auth, Firestore, Storage | `config/firebase.js`, auth/storage/profile/backend services |
| **tailwindcss** + **@tailwindcss/vite** | ^4.3 | Utility CSS (v4 `@theme` tokens) | all styling |
| **@fontsource/inter** · **@fontsource/plus-jakarta-sans** | ^5.3 | Self-hosted app fonts | `main.jsx` |
| **pdfjs-dist** | ^6.3 | PDF text extraction (Web Worker) | `services/fileParser.js` |
| **mammoth** | ^1.12 | DOCX → text (parsing) and DOCX → HTML (preview) | `fileParser.js`, `CandidateView` |
| **tesseract.js** | ^7 | OCR for images and scanned PDFs | `services/ocr.js` |
| **framer-motion** | ^12.43 | Landing motion | `src/landing/*` |
| **three** · **@react-three/fiber** · **@react-three/drei** | 0.186 / ^9 / ^10 | Landing WebGL scene | `src/landing/scene/*`, `Showcase3D` |
| **@tanstack/react-virtual** | ^3.14 | Virtualized HR table | `components/hr/HrTable.jsx` |
| **react-helmet-async** | ^3.0 | Per-page meta/SEO | `Seo.jsx` |
| **sonner** | ^2.0 | Toasts | `App.jsx` + dashboards |
| **animejs** | ^4.5 | Landing micro-animations | `src/landing/ui/kit.jsx` |
| **lucide-react** | ^1.34 | Icons | misc |

## Dev dependencies

| Package | Purpose |
| --- | --- |
| **vite** ^8.1 | Build + dev server (rolldown) |
| **@vitejs/plugin-react** ^6 | React fast refresh |
| **vite-plugin-pwa** ^1.3 | Manifest + Workbox service worker |
| **vitest** ^4.1 | Test runner |
| **oxlint** ^1.71 | Linter |
| **jszip** ^3.10 | Tooling/test utility |
| **@types/react**(-dom) | Editor intellisense |

## Scripts

`dev` · `build` · `lint` · `test` · `preview` — see [Getting Started → Quickstart](../getting-started/quickstart.md).

## Build pipeline notes (`vite.config.js`)

1. **Plugins:** `react()`, `tailwindcss()`, custom `pdfjsWorkerPolyfill()`, `VitePWA(...)`.
2. **`pdfjsWorkerPolyfill()`** — prepends ES2026 shims (`Map.prototype.getOrInsertComputed`/`getOrInsert`, `Uint8Array.prototype.toHex`/`fromHex`) to the pdf.js **worker**:
   - **Dev:** a middleware intercepts `pdf.worker(.min).mjs` requests and serves the real file with the patch prepended (worker assets bypass transforms — the middleware is the only reliable hook).
   - **Build:** `generateBundle` patches the emitted worker asset in `dist/`.
   - The main realm gets the same shims from `src/services/pdfjsCompat.js`.
3. **PWA:** manifest (standalone, `#0A1F1C` theme), Workbox precache of `js/css/html/svg/woff2`, `navigateFallback: /index.html`, 5 MB per-file cap, auto cleanup.

## Fonts & meta (`index.html`)

Inter Tight (Google Fonts) + Cabinet Grotesk (cdnfonts) for the landing; self-hosted Jakarta/Inter for the app; full OG/Twitter meta; `theme-color: #0A1F1C`; manifest link.

---

**Related pages:** [Project Map](./project-map.md) · [Frontend → Design System](../frontend/design-system.md) · [Services → Parsing](../services/parsing.md) (why the pdfjs patch exists)
