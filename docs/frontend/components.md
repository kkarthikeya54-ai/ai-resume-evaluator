# Components

> 🖥️ Frontend · Prev: [Pages](./pages.md) · Next: [Design System](./design-system.md)

## Shared components (`src/components/`)

| Component | What it does |
| --- | --- |
| `RoleGuards.jsx` | The five route guards — see [Architecture → Routing](../architecture/routing-and-guards.md) |
| `ProtectedRoute.jsx` | Raw auth gate used under the role guards |
| `RolePicker.jsx` | Onboarding role selection (`student`/`hr`) |
| `DashboardHeader.jsx` | App header: logo, role badge, nav (sessions/account), sign out |
| `SessionBar.jsx` | Current-session name + link to `/sessions` |
| `HeroMetrics.jsx` | Landing hero stat chips |
| `Seo.jsx` | react-helmet-async wrapper: title, description, per-page `noindex` |
| `ErrorBoundary.jsx` | Top-level crash boundary with reload CTA |
| `FormField.jsx`, `Logo.jsx` | Auth-form input; brand logo/wordmark with size variants |
| `EmailVerificationBanner.jsx` | Persistent "verify your email" banner |
| `VerifyGateModal.jsx` | Blocks AI runs for unverified accounts; "continue anyway" escape (product decision: encourages verification without hard-blocking) |
| `CookieConsentBanner.jsx`, `LegalLayout.jsx` | Consent UI; shared legal-page layout |
| `StudentResumePreviewModal.jsx` | 3D resume preview modal, focus-trapped |

## AI result sections (student dashboard)

All follow the same contract — props `resumeText`, state via `useGemini()`, subscribe via `subscribeToRun`, render **skeleton while `loading && !data`** (see [Motion & Loading](./motion-and-loading.md)):

| Component | AI prompt | Renders |
| --- | --- | --- |
| `ResumeParser.jsx` | (paste/edit panel) | Editable resume text |
| `ResumeAnalyzer.jsx` | `summary` | Professional summary |
| `ReadinessScore.jsx` | `readiness` | DonutChart + 4 dimension bars + RadarChart + strengths/weaknesses |
| `TargetRoleSwitcher.jsx` | `targetRoles` + `skillDomains` | Role-match cards + domain chart |
| `SkillsGap.jsx` | `skillGap` + `missingSkills` | Current/in-demand/gaps triad + priority cards with resources |
| `ResumeImprovements.jsx` | `improvements` | Prioritized fix suggestions |
| `RecommendedContent.jsx` | `projects` + `certifications` | Project cards + certification cards |
| `Roadmap.jsx` | `roadmap` | 30/60/90-day columns |
| `DSARecommend.jsx` | `dsa` | Topics, weekly practice plan, resources |
| `InterviewPrep.jsx` | `interviewQuestions` | Categorized Q&A with model answers |

## HR subcomponents (`components/hr/`)

| Component | Notes |
| --- | --- |
| `HrConfigForm.jsx` | Job rules, keywords, role presets, dropzone, Process CTA (Magnetic + sheen sweep) |
| `MultiFileDropzone.jsx` | Multi-file selection with `isSupportedFile` + `validateFileBytes` + size caps |
| `HrProgress.jsx` | Stage meter (flowing primary-blue → sky when done) + skeleton rows |
| `HrResults.jsx` | Results orchestrator: stats, filters, table, compare, copilot |
| `HrTable.jsx` | **Virtualized** (@tanstack/react-virtual) ranked table — only visible rows render; sortable columns, shortlist star, per-row cursor spotlight |
| `CompareModal.jsx` | Side-by-side of up to 3 candidates (TiltCard3D cards) |
| `HrChatPanel.jsx` | Recruiter Copilot chat (see [AI Pipeline → Copilot](../ai-pipeline/copilot.md)) |
| `Markdown.jsx` | Minimal markdown renderer for copilot answers |
| `KanbanBoard.jsx` | Candidate stages as a board (knees/screened/shortlisted…) with drag-ish grouping |
| `CopilotAuditLog.jsx` | Verb-annotated history of copilot actions on candidates |
| `JourneyTimeline.jsx` | Candidate-state changes rendered as a timeline |
| `LeaderboardHero.jsx` | Top-candidate leaderboard card for the HR dashboard header |

## UI micro-components (`components/ui/`)

`Button` (variants + sheen sweep), `Magnetic`, `TiltCard3D` (3D tilt cards), `SpotlightCard` (cursor spotlight), `CountUp` (animated numbers), `Reveal`, `Marquee`, `TextScramble`, `Typewriter`, `BorderBeam`, `ConfettiBurst` (success bursts), `ScoreGauge3D` (3D gauge), `SkillCloud3D` (3D skill chip cloud), `TugOfWar` (drag tugger), `Icon`, and `velaris` (the raw-WebGL ambient shader behind app pages).

## Upload components (`components/upload/`)
`FileDropzone` (single-file), `UploadProgress`, `FileInfoCard`, `SuccessAnimation`.

## Charts (`components/charts/`)
Hand-rolled **SVG** — no chart library: `DonutChart` (stroke-dasharray + `donut-fill`), `RadarChart` (polygon + grid rings), `SkillDistributionChart` (lazy-loaded bars). Bands reuse the palette semantics (primary / shortlist-amber / red).

## The event-bus pattern (`utils/analysisEvents.js`)

`AppPage` and the 10 AI sections are decoupled by a tiny window CustomEvent bus:

```js
dispatchRunAnalyses(resumeText)      // fired by "Run All" + auto-run
subscribeToRun(handler)              // each section calls its own execute(...)
```

Why: "run everything" stays trivial, while each section owns its own loading/error/data state via `useGemini()`. Cost: implicit coupling by event name — `ANALYSIS_TYPES` in the same file documents the contract.

## Utility hooks (`src/hooks/`)

| Hook | Purpose |
| --- | --- |
| `useGemini.js` | `{loading, error, data, execute, reset}` state machine around `GeminiService` |
| `useAnalysisRunState.js` | Co-located loading/error/data state for each AI section (wraps `useGemini`) |
| `useCountUp.js` | rAF count-up with easing; in-view gated; reduced-motion → instant |
| `useInView.js` | One-shot IntersectionObserver visibility |
| `useFocusTrap.js` | WCAG focus trap: Tab/Shift+Tab cycle, Escape close, focus restore — used by all three modals |

---

**Related pages:** [Pages](./pages.md) · [Design System](./design-system.md) · [Motion & Loading](./motion-and-loading.md) · [Services → AI Gateway](../services/ai-gateway.md)
