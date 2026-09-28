import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES, getRoleRedirect } from "../services/role";
import Button from "../components/ui/Button";
import Logo from "../components/Logo";
import { Chip } from "../components/onboarding/Illustrations";
import {
  UploadIllustration,
  ScoreIllustration,
  SkillGapIllustration,
  RoadmapIllustration,
  InterviewIllustration,
  SessionIllustration,
  RankingIllustration,
  CompareIllustration,
  ProfileIllustration,
  ChatIllustration,
} from "../components/onboarding/Illustrations";

const ROLE_OPTIONS = [
  {
    id: ROLES.STUDENT,
    title: "I'm a student",
    subtitle: "Evaluate my resume, close skill gaps, and prep for interviews.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 9 12 4 2 9l10 5 10-5Z" />
        <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
        <path d="M22 9v5" />
      </svg>
    ),
  },
  {
    id: ROLES.HR,
    title: "I'm hiring",
    subtitle: "Screen, rank, compare, and shortlist candidate resumes.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 13h18" />
      </svg>
    ),
  },
];

const STUDENT_SLIDES = [
  {
    key: "upload",
    title: "Upload your resume",
    desc: "Drop a PDF, DOCX, or paste your text. It's parsed locally on your device — nothing leaves it.",
    bullets: ["PDF, DOCX & pasted text", "Parsed locally & private", "Auto-saved across sessions"],
    illustration: <UploadIllustration />,
  },
  {
    key: "score",
    title: "Know your placement readiness",
    desc: "Get a 0–100 readiness score with a clear breakdown across skills, experience, education, and projects.",
    bullets: ["Detailed dimension scores", "Instant strengths & gaps", "Re-run anytime you update"],
    illustration: <ScoreIllustration />,
  },
  {
    key: "gaps",
    title: "Close your skill gaps",
    desc: "Compare your resume against industry trends and get prioritized resources to bridge each gap.",
    bullets: ["Skill-gap detection", "Curated learning resources", "Priority-ranked suggestions"],
    illustration: <SkillGapIllustration />,
  },
  {
    key: "roadmap",
    title: "Follow a career roadmap",
    desc: "A 30/60/90-day plan tailored to your profile keeps you moving toward your target role.",
    bullets: ["30/60/90-day milestones", "Track your progress", "Adjust as you grow"],
    illustration: <RoadmapIllustration />,
  },
  {
    key: "interview",
    title: "Prepare for interviews",
    desc: "Practice with categorized questions, DSA topics, and model answers that fit your level.",
    bullets: ["Interview Q&A bank", "DSA practice plan", "Tips with every answer"],
    illustration: <InterviewIllustration />,
  },
];

const HR_SLIDES = [
  {
    key: "session",
    title: "Create a hiring session",
    desc: "Each session holds the job rules, keywords, and candidate resumes for one role — organize everything by position.",
    bullets: ["Name sessions per role", "Set job rules & keywords", "Reopen anytime"],
    illustration: <SessionIllustration />,
  },
  {
    key: "ranking",
    title: "Drop resumes, get rankings",
    desc: "Batch-upload multiple resumes. Every candidate is parsed and scored on skills, experience, education, projects, and keyword fit.",
    bullets: ["Multi-file batch upload", "Transparent dimension scores", "Runs on your device"],
    illustration: <RankingIllustration />,
  },
  {
    key: "compare",
    title: "Compare & shortlist",
    desc: "Star the best candidates and compare up to three side-by-side, with the top score highlighted per dimension.",
    bullets: ["One-tap shortlist", "Side-by-side comparison", "Export-ready summary"],
    illustration: <CompareIllustration />,
  },
  {
    key: "profile",
    title: "Open candidate profiles",
    desc: "Every candidate gets a detailed profile with resume preview and the full evaluation behind their score.",
    bullets: ["Resume preview (PDF/DOCX)", "Full evaluation rationale", "All data local to you"],
    illustration: <ProfileIllustration />,
  },
  {
    key: "copilot",
    title: "Chat with the AI copilot",
    desc: "Ask questions grounded in your data — every copilot answer cites exact lines from candidate resumes.",
    bullets: ["Answers with verbatim evidence", "Compare across candidates", "Confidence flags included"],
    illustration: <ChatIllustration />,
  },
];

const STEPS = [
  { id: "role", label: "Workspace" },
  { id: "tour", label: "Tour" },
  { id: "done", label: "Ready" },
];

export default function Onboarding() {
  const { user, role, loading, logout, setRole } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [phase, setPhase] = useState("role");
  const [slide, setSlide] = useState(0);

  const firstName = user?.displayName?.split(" ")[0] || "";

  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  const startTour = () => {
    setSlide(0);
    setPhase("tour");
  };

  const nextSlide = () => {
    const slides = selected === ROLES.HR ? HR_SLIDES : STUDENT_SLIDES;
    if (slide < slides.length - 1) setSlide(slide + 1);
    else setPhase("done");
  };

  const backSlide = () => {
    if (slide === 0) setPhase("role");
    else setSlide(slide - 1);
  };

  const finish = () => {
    if (selected && user?.uid) {
      setRole(selected, user.uid);
      navigate(getRoleRedirect(selected));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B1F3A]/[0.04]">
        <span className="h-8 w-8 animate-pulse rounded-full border-2 border-[var(--theme-border)] border-t-primary-600" />
      </div>
    );
  }

  if (role) return null;

  const slides = selected === ROLES.HR ? HR_SLIDES : STUDENT_SLIDES;
  const phaseIndex = phase === "role" ? 0 : phase === "tour" ? 1 : 2;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--theme-bg)]/85 text-[var(--theme-text,#0f172a)] transition-colors duration-300">
      <div className="aurora" />
      <div className="dot-grid pointer-events-none absolute inset-0" />

      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-6 py-6 border-b border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)]/95 backdrop-blur-xl">
        <Logo size="md" />
        <button
          onClick={handleSignOut}
          className="rounded-lg border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-3.5 py-1.5 text-sm font-semibold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 transition-colors shadow-2xs cursor-pointer active:scale-95"
        >
          Sign out
        </button>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-10 pb-16">
        <div className="rounded-3xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 shadow-xl sm:p-10">
          <div className="mb-9">
            <div className="flex items-center gap-3">
              {STEPS.map((step, i) => (
                <div key={step.id} className={`flex items-center gap-3 ${i < STEPS.length - 1 ? "flex-1" : "flex-none"}`}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border text-[12px] font-bold transition-colors ${
                        i <= phaseIndex
                          ? "border-primary-600 bg-primary-600 text-white"
                          : "border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 text-[var(--theme-text-muted,#64748b)]"
                      }`}
                    >
                      {i < phaseIndex ? "✓" : i + 1}
                    </span>
                    <span className={`hidden text-xs font-semibold sm:block ${i <= phaseIndex ? "text-[var(--theme-text,#0f172a)]" : "text-[var(--theme-text-muted,#64748b)]"}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--theme-border,#e2e8f0)]">
                      <div
                        className="bar-grow h-full rounded-full bg-primary-600"
                        style={{ width: i < phaseIndex ? "100%" : "0%" }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {phase === "role" && (
            <div key="role" className="onboarding-slide">
              <p className="text-center text-xs font-bold uppercase tracking-wider text-primary-600">
                {firstName ? `Welcome, ${firstName}` : "Welcome"}
              </p>
              <h2 className="mt-2 text-center text-2xl font-extrabold text-[var(--theme-text,#0f172a)] sm:text-3xl">
                Who is this account for?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-center text-sm leading-relaxed text-[var(--theme-text-muted,#64748b)] font-medium">
                Pick a workspace to start with. You can switch anytime from the Account page.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {ROLE_OPTIONS.map((option) => {
                  const active = selected === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelected(option.id)}
                      className={`group rounded-2xl border p-6 text-left transition-all duration-300 cursor-pointer ${
                        active
                          ? "border-primary-500 bg-primary-50/70 shadow-xs ring-2 ring-primary-500/20"
                          : "border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] hover:border-primary-300 hover:shadow-2xs"
                      }`}
                    >
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                          active ? "bg-primary-600 text-white" : "bg-primary-50 text-primary-600 group-hover:bg-primary-100"
                        }`}
                      >
                        {option.icon}
                      </span>
                      <span className="mt-4 block text-base font-bold text-[var(--theme-text,#0f172a)]">{option.title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-[var(--theme-text-muted,#64748b)]">{option.subtitle}</span>
                      <span className="mt-4 flex items-center gap-2 text-xs font-bold text-primary-600">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[11px]">
                          {active ? "✓" : ""}
                        </span>
                        Choose this workspace
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <Button onClick={startTour} disabled={!selected} className="w-full px-10 py-3 disabled:opacity-50 disabled:pointer-events-none sm:w-auto">
                  Continue
                </Button>
                <span className="text-center text-xs text-[var(--theme-text-muted,#64748b)] font-medium">
                  Don&apos;t worry — you can change this later.
                </span>
              </div>
            </div>
          )}

          {phase === "tour" && (
            <div key={`${slides[slide].key}-${slide}`} className="onboarding-slide">
              <p className="text-center text-xs font-bold uppercase tracking-widest text-primary-600">
                {slide + 1} of {slides.length}
              </p>
              <div className="mt-6 flex min-h-[220px] items-center justify-center overflow-hidden rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-4 py-8">
                {slides[slide].illustration}
              </div>
              <div className="mt-8 text-center">
                <h2 className="text-xl font-extrabold text-[var(--theme-text,#0f172a)] sm:text-2xl">{slides[slide].title}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--theme-text-muted,#64748b)] font-medium">
                  {slides[slide].desc}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {slides[slide].bullets.map((bullet) => (
                  <Chip key={bullet} tone={slide % 2 ? "violet" : "primary"}>
                    {bullet}
                  </Chip>
                ))}
              </div>
              <div className="mt-9 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={backSlide}
                  className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 transition-colors cursor-pointer active:scale-95"
                >
                  {slide === 0 ? "Change workspace" : "Back"}
                </button>
                <div className="flex gap-1.5">
                  {slides.map((s, i) => (
                    <span
                      key={s.key}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === slide ? "w-6 bg-primary-600" : "w-1.5 bg-[var(--theme-border,#e2e8f0)]"
                      }`}
                    />
                  ))}
                </div>
                <Button onClick={nextSlide} className="px-6 py-2.5">
                  {slide === slides.length - 1 ? "Finish" : "Next"}
                </Button>
              </div>
            </div>
          )}

          {phase === "done" && (
            <div key="done" className="onboarding-slide text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center">
                <svg viewBox="0 0 52 52" className="success-check h-20 w-20">
                  <circle cx="26" cy="26" r="24" fill="none" className="success-circle" />
                  <path fill="none" d="M14 27l8 8 16-16" className="success-checkmark" />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-extrabold text-[var(--theme-text,#0f172a)] sm:text-3xl">
                You&apos;re all set{firstName ? `, ${firstName}` : ""}!
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--theme-text-muted,#64748b)] font-medium">
                Your{" "}
                <span className="font-bold text-[var(--theme-text,#0f172a)]">
                  {selected === ROLES.HR ? "Hiring" : "Student"}
                </span>{" "}
                workspace is ready. Taking you to your dashboard.
              </p>
              <Button onClick={finish} className="mt-9 px-10 py-3.5">
                Open my {selected === ROLES.HR ? "Hiring" : "Student"} dashboard
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
