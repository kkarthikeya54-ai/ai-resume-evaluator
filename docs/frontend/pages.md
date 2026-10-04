# Pages

> 🖥️ Frontend · Next: [Components](./components.md)

One component per route (guards in [Architecture → Routing](../architecture/routing-and-guards.md)).

## Landing — `pages/Landing.jsx` → `landing/LandingCinematic.jsx`
A self-contained cinematic module (~2,900 lines in `src/landing/`): one continuous scroll journey over a fixed three.js stage — a 3D "resume document" that reassembles across **11 story phases**.

- **`utils/scroll.js`** — the scroll store: measures the "knee" (3D track vs post-track split), maps scroll → story fraction, exposes phase bounds, re-anchors on resize preserving story position against pre-resize document height.
- **Auth-aware CTAs:** guests → demo modal (paste text → simulated analysis → routed to `/signup`); students → `/upload`; HR → `/hr`.
- Key pieces: `overlay/CanvasStage` (WebGL check + lazy scene), `overlay/HiggsfieldLayer` (aurora wash), `ui/Chrome` (preloader/nav/progress/footer), `ui/Showcase3D`, `scene/` (camera rig + chapter meshes).

## Login / Signup
- Email/password + Google popup + password reset (Login); consent checkbox + confirm password (Signup).
- Signed-in users with a role are redirected to their dashboard; errors localized via `utils/authErrors.js`.

## Onboarding
3 steps — role picker ("I'm a student" / "I'm hiring") → 5-slide role-specific tour (10 hand-built SVG illustrations in `components/onboarding/Illustrations.jsx`) → done (animated check). Finish calls `setRole(uid, role)` then navigates to the role's dashboard.

## UploadPage — `/upload` (student)
Stages: `idle → uploading → ready → analyzing` (+ error).
- `FileDropzone` (single file) → magic-byte validation → `extractText` → `looksLikeResume` soft warning (can proceed).
- Text saved via `saveResumeText(uid, text)`; navigates to `/app` with `resumeText` in router state (triggers auto-run). Skeleton cards render during uploading/analyzing.

## AppPage — `/app` (student)
- Hero card with quick metrics + sticky scrollspy nav (IntersectionObserver, `rootMargin: -15% 0px -75% 0px`).
- **`dispatchRunAnalyses(resumeText)`** fans out to 10 AI sections (event bus — see [Components](./components.md#the-event-bus-pattern)).
- Renders: ResumeParser (paste/edit text), ResumeAnalyzer, ReadinessScore, TargetRoleSwitcher, lazy SkillDistributionChart, SkillsGap, ResumeImprovements, RecommendedContent, Roadmap, DSARecommend, InterviewPrep.
- Auto-runs once per `(sessionId, resumeText-hash)` via an `autoRanKey` ref (the AI cache would catch repeats anyway).
- `StudentResumePreviewModal` — stylized 3D preview (focus-trapped).

## HrDashboard — `/hr`
The orchestrator. Owns: session load/create (redirects to the most recent session), config state (rules/keywords/files), `runHrAnalysis` execution with progress + cancel, the email-verification gate for unverified accounts (with "continue anyway"), persistence (IndexedDB + optional cloud sync), storage-quota warnings, and sample-session loading (`data/sampleSession.js`).

**Pass-rate auto-rejection:** the results header carries a 0–100% `PassRateSlider` (also mirrored at record level so `/sessions` can show it). Scores below the rate move to the **Rejected** stage via `services/passRate.js`, remembering their previous stage in `rejectedFrom`; lowering or clearing the rate restores them, and a hand-rescue (the card's *Restore* button, or dragging a candidate out of Rejected) marks it `passRateExempt` so a reload can't silently undo it — the marker lapses the next time the slider moves. The stored rate is re-applied whenever the session loads, so auto-rejections survive reloads and travel across devices.

**Multi-device recovery:** opening `/hr?session=<id>` for a session that isn't in this device's IndexedDB pulls the full record from the HR API Worker (`fetchHrSession`), caches it locally (`putSession`), and proceeds — so a hiring session started on one device opens on another. If neither local store nor the cloud has the record, it redirects to `/sessions`.

## CandidateView — `/candidate/:id`
Full candidate report: 3D tilt header with score gauge, tabbed sections (overview / evaluation / resume), per-dimension score bars, matched/missing keyword chips, skills display, PDF preview via blob URL or DOCX→HTML via mammoth, shortlist toggle (persists to session + cache), Markdown report export.

## SessionsPage — `/sessions`
Create/rename/delete sessions for the current role; one-time migration of the legacy HR single-session store; storage-friendly summaries (candidate count / resume loaded / rules preview).

HR sessions also pick up an **interview date** and a starting **pass rate** in the New Session modal (the date stays editable later via the calendar button on each card). Dated sessions show an *Interview:* chip, are plotted as clickable day chips on `InterviewCalendar`, and show *Pass rate: N%* on the card when the rate is above 0.

## Account — `/account`
Profile editing (basic info; academic details for students; HR company details), usage stats (evaluations, top score, tier), email-verification resend, role switch (confirm modal → data wipe), sign out.

## Legal pages
`PrivacyPolicy`, `TermsConditions`, `RefundPolicy`, `CookiePolicy` — all sharing `LegalLayout`, `noindex` via `Seo`.

---

**Related pages:** [Components](./components.md) · [Motion & Loading](./motion-and-loading.md) · [AI Pipeline → Student Flow](../ai-pipeline/student-flow.md) · [AI Pipeline → Ranking Math](../ai-pipeline/ranking-math.md)
