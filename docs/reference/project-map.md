# Project Map

> 📖 Reference · Prev: [Tech Stack](./tech-stack.md)

Every file in the workspace with a one-line purpose. Narrative docs live in the section folders — this page is the index.

```
ai-resume-evaluation/
├── index.html                  # SPA shell: meta/OG, fonts, #root (no PWA manifest)
├── package.json                # Scripts + dependency manifest
├── vite.config.js              # react · tailwind · pdfjs worker polyfill (no PWA plugin)
├── firebase.json               # Deploy config: firestore, storage, functions (nodejs20)
├── firestore.rules             # users/{uid} + hr_sessions owner-only
├── firestore.indexes.json      # No composite indexes needed
├── storage.rules               # resumes/{uid}/... owner-only (legacy Firebase path)
├── .env.example                # Env template (names only, placeholders)
├── .gitignore / .oxlintignore
├── docs/                       # ← this wiki (see docs/README.md)
├── public/favicon.svg          # App icon (favicon / OG image)
│
├── src/
│   ├── main.jsx                # StrictMode → ErrorBoundary → HelmetProvider → App
│   ├── App.jsx                 # Router + guards + Velaris background + Toaster + lazy routes
│   ├── index.css               # Design tokens (@theme), motion/loading layer, utilities
│   ├── config/
│   │   ├── firebase.js         # Firebase init + isConfigured gate
│   │   └── ai.js               # AI proxy URL + generation params + hasAccess()
│   ├── context/
│   │   └── AuthContext.jsx     # user + role + token hygiene + switchRole(wipe)
│   ├── pages/
│   │   ├── Landing.jsx         # / — renders LandingCinematic
│   │   ├── Login.jsx           # /login
│   │   ├── Signup.jsx          # /signup
│   │   ├── Onboarding.jsx      # /onboarding — role picker + role-specific tour
│   │   ├── UploadPage.jsx      # /upload — student resume upload
│   │   ├── AppPage.jsx         # /app — student analysis dashboard (10 AI sections)
│   │   ├── HrDashboard.jsx     # /hr — HR workspace orchestrator
│   │   ├── CandidateView.jsx   # /candidate/:id — candidate report + preview + export
│   │   ├── SessionsPage.jsx    # /sessions — session CRUD (both roles)
│   │   ├── Account.jsx         # /account — profile, role switch, data wipe
│   │   └── PrivacyPolicy · TermsConditions · RefundPolicy · CookiePolicy (.jsx)
│   ├── components/
│   │   ├── RoleGuards.jsx      # HrRoute/StudentRoute/AuthRoute/OnboardingRoute
│   │   ├── ProtectedRoute.jsx  # auth gate
│   │   ├── DashboardHeader.jsx · SessionBar.jsx · Seo.jsx · ErrorBoundary.jsx
│   │   ├── FormField.jsx · Logo.jsx · LegalLayout.jsx · CookieConsentBanner.jsx
│   │   ├── EmailVerificationBanner.jsx · VerifyGateModal.jsx
│   │   ├── Skeleton.jsx        # Skeleton primitives (Card/Stack/Rows/Ribbon/Donut)
│   │   ├── StudentResumePreviewModal.jsx
│   │   ├── ReadinessScore.jsx · SkillsGap.jsx · ResumeImprovements.jsx
│   │   ├── RecommendedContent.jsx · Roadmap.jsx · DSARecommend.jsx
│   │   ├── InterviewPrep.jsx · ResumeParser.jsx · ResumeAnalyzer.jsx
│   │   ├── TargetRoleSwitcher.jsx
│   │   ├── charts/             # DonutChart · RadarChart · SkillDistributionChart (SVG)
│   │   ├── hr/                 # HrConfigForm · MultiFileDropzone · HrProgress · HrResults
│   │   │                       # HrTable (virtualized) · CompareModal · HrChatPanel · Markdown
│   │   │                       # KanbanBoard · CopilotAuditLog · JourneyTimeline · LeaderboardHero
│   │   ├── upload/             # FileDropzone · UploadProgress · FileInfoCard · SuccessAnimation
│   │   ├── ui/                 # Button · Magnetic · TiltCard3D · SpotlightCard · CountUp
│   │   │                       # Reveal · Marquee · TextScramble · BorderBeam · ScoreGauge3D
│   │   │                       # SkillCloud3D · velaris (WebGL shader background) · ConfettiBurst
│   │   │                       # Typewriter · TugOfWar
│   │   └── onboarding/Illustrations.jsx   # Chip + 10 SVG tour illustrations
│   ├── services/               # See docs/services/ — the whole logic layer
│   │   ├── auth.js · role.js · authErrors→(utils) · fileParser.js · pdfjsCompat.js · ocr.js
│   │   ├── ocrWorkerPool.js · extractCache.js · localScoring.js
│   │   ├── gemini.js · hrScoring.js · hrChat.js · hrBackend.js
│   │   ├── sessionStore.js · hrStore.js · localResumeStorage.js
│   │   ├── supabaseResumeStorage.js · resumeStorage.js (facade) · userProfile.js
│   │   ├── cloudResumeStorage.js (⚠️ dead code — legacy Firebase, unimported)
│   │   ├── dataWipe.js · storageUtils.js
│   │   └── __tests__/          # fileParser · gemini · hrScoring · hrChat · hrStore · storageUtils
│   │                           # localScoring · perfPipeline · chatRankContext · copilotActions
│   │                           # authErrors · KanbanBoard
│   ├── hooks/                  # useGemini · useCountUp · useInView · useFocusTrap · useAnalysisRunState
│   ├── utils/                  # analysisEvents (event bus) · authErrors (error map)
│   ├── data/sampleSession.js   # Pre-built HR demo session
│   └── landing/                # Cinematic landing (self-contained module)
│       ├── LandingCinematic.jsx · landing.css
│       ├── overlay/            # CanvasStage · HiggsfieldLayer · StoryScroll · sections/ · modals/AnalysisModal
│       ├── scene/              # Scene · cameraRig · chapters1/2 · primitives · resumeStage
│       ├── ui/                 # Chrome · kit · Showcase3D · Storyline · story
│       └── utils/              # scroll (store) · environment · webgl · colors · textures
│
├── functions/                  # ⚠️ Legacy — Cloud Functions (Node 20, ESM); Blaze required to deploy
│   ├── index.js                # analyzeResume · saveHrSession · updateCandidateStatus
│   │                           # exportHrSessionCsv · deleteUserAccount (CORS-fixed)
│   └── package.json            # firebase-admin + firebase-functions
│
└── worker/                     # Cloudflare Workers
    ├── ai-proxy.js             # POST {prompt} → Gemini/NVIDIA → {result}
    ├── hr-api.js               # HR cloud backend: /session(s) CRUD + /account/delete (Workers KV)
    ├── wrangler.toml · wrangler.hr-api.toml · deploy.js · README.md
```

**Counts:** ~145 source files under `src/` · 12 test files (111 tests) · 1 legacy Cloud Functions module (5 endpoints) · 2 Cloudflare Workers (AI proxy + HR API).

---

**Related pages:** [Tech Stack](./tech-stack.md) · [Wiki home](../README.md)
