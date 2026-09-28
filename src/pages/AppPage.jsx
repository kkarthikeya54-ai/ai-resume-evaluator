import { useEffect, useRef, useState, Suspense, lazy } from "react";
import Icon from "../components/ui/Icon";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../services/role";
import { getResume, removeResume } from "../services/resumeStorage";
import { clearGeminiCache } from "../services/gemini";
import { sendVerificationEmail } from "../services/auth";
import { dispatchRunAnalyses } from "../utils/analysisEvents";
import { getSession, putSession } from "../services/sessionStore";
import DashboardHeader from "../components/DashboardHeader";
import Seo from "../components/Seo";
import SessionBar from "../components/SessionBar";
import EmailVerificationBanner from "../components/EmailVerificationBanner";
import VerifyGateModal from "../components/VerifyGateModal";
import ResumeParser from "../components/ResumeParser";
import ResumeAnalyzer from "../components/ResumeAnalyzer";
import ReadinessScore from "../components/ReadinessScore";
import SkillsGap from "../components/SkillsGap";
import ResumeImprovements from "../components/ResumeImprovements";
import RecommendedContent from "../components/RecommendedContent";
import Roadmap from "../components/Roadmap";
import DSARecommend from "../components/DSARecommend";
import InterviewPrep from "../components/InterviewPrep";
import TargetRoleSwitcher from "../components/TargetRoleSwitcher";
import StudentResumePreviewModal from "../components/StudentResumePreviewModal";
import { SkeletonCard } from "../components/Skeleton";
import Magnetic from "../components/ui/Magnetic";
import SpotlightCard from "../components/ui/SpotlightCard";
import HeroMetrics from "../components/HeroMetrics";
import useAnalysisRunState from "../hooks/useAnalysisRunState";

const SkillDistributionChart = lazy(() => import("../components/charts/SkillDistributionChart"));

const NAV_ITEMS = [
  { id: "summary", label: "Summary" },
  { id: "readiness", label: "Readiness" },
  { id: "skill-gap", label: "Skill Gap" },
  { id: "improvements", label: "Improvements" },
  { id: "recommendations", label: "Projects & Certs" },
  { id: "roadmap", label: "Roadmap" },
  { id: "dsa", label: "DSA" },
  { id: "interview", label: "Interview Prep" },
];

function shortHash(input) {
  let hash = 5381;
  let hash2 = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    hash = ((hash * 33) ^ c) >>> 0;
    hash2 = ((hash2 * 16777619) ^ c) >>> 0;
  }
  return `${hash.toString(36)}${hash2.toString(36)}`;
}

export default function AppPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const [resumeText, setResumeText] = useState(location.state?.resumeText || "");
  const [sessionMeta, setSessionMeta] = useState({ id: sessionId || null, name: "" });
  const autoLoaded = useRef(Boolean(location.state?.resumeText));
  const autoRanKey = useRef(null);
  const persistTimer = useRef(null);
  const [hasSavedResume, setHasSavedResume] = useState(Boolean(location.state?.resumeText));
  const [activeSection, setActiveSection] = useState(null);
  const [verifyGateOpen, setVerifyGateOpen] = useState(false);
  const { sectionsReady, totalSections, running: analysesRunning, readyScore } = useAnalysisRunState();
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return undefined;
    let cancelled = false;

    if (sessionId) {
      getSession(sessionId).then((record) => {
        if (cancelled) return;
        if (!record || record.uid !== user.uid || record.role !== ROLES.STUDENT) {
          navigate("/sessions", { replace: true });
          return;
        }
        setSessionMeta({ id: record.id, name: record.name });
        const text = record.payload?.resumeText || "";
        autoLoaded.current = true;
        setResumeText(text);
        setHasSavedResume(Boolean(text));
      });
      return () => {
        cancelled = true;
      };
    }

    getResume(user.uid)
      .then((saved) => {
        if (cancelled) return;
        if (saved?.text) {
          autoLoaded.current = true;
          setResumeText(saved.text);
          setHasSavedResume(true);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user?.uid, sessionId, navigate]);

  useEffect(() => {
    if (!user?.uid || !sessionMeta.id) return undefined;
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      getSession(sessionMeta.id).then((record) => {
        if (!record) return;
        putSession({ ...record, payload: { ...record.payload, resumeText } });
      });
    }, 800);
    return () => clearTimeout(persistTimer.current);
  }, [resumeText, sessionMeta.id, user?.uid]);

  useEffect(() => {
    if (autoRanKey.current) return;
    if (!resumeText) return;
    const shouldAutoRun = Boolean(location.state?.resumeText) || hasSavedResume;
    if (!shouldAutoRun) return;
    autoRanKey.current = `${sessionId || "saved"}:${shortHash(resumeText)}`;
    dispatchRunAnalyses(resumeText);
  }, [resumeText, hasSavedResume, location.state?.resumeText, sessionId]);

  useEffect(() => {
    if (!resumeText) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 }
    );
    NAV_ITEMS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [resumeText]);

  const handleRunAll = () => {
    if (user && !user.emailVerified) {
      setVerifyGateOpen(true);
      return;
    }
    dispatchRunAnalyses(resumeText);
  };

  const handleUploadClick = () => {
    navigate(sessionMeta.id ? `/upload?session=${sessionMeta.id}` : "/upload");
  };

  const handleScrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 65;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  };

  const handleDeleteResume = async () => {
    if (!user?.uid) return;
    if (!window.confirm("Delete your saved resume and all analyses? This cannot be undone.")) {
      return;
    }
    if (sessionMeta.id) {
      const record = await getSession(sessionMeta.id);
      if (record) {
        await putSession({ ...record, payload: {} });
      }
    } else {
      try {
        await removeResume(user.uid);
        clearGeminiCache();
      } catch {
        // Best-effort
      }
    }
    autoLoaded.current = true;
    setResumeText("");
    setHasSavedResume(false);
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg)]/85 text-[var(--theme-text,#0f172a)] pb-16 transition-colors duration-300">
      <Seo
        title={sessionMeta.name ? `${sessionMeta.name} — My Resume Insights` : "My Resume Insights"}
        description="Get placement-readiness scores, skill-gap analysis, and a personalized roadmap for your resume."
        noindex
      />
      <DashboardHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header Hero Section — cursor-reactive glow follows the pointer */}
        <SpotlightCard className="rounded-3xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 md:p-8 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 text-primary-600">
                  <Icon name="gradCap" className="h-3.5 w-3.5" /> Student Placement Dashboard
                </span>
                {sessionMeta.name && (
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-700">
                    Session: {sessionMeta.name}
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--theme-text,#0f172a)] mt-2">
                Welcome back{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}
              </h1>
              <p className="text-[var(--theme-text-muted,#475569)] mt-1 text-sm font-semibold">
                {resumeText
                  ? "Your resume evaluation is ready — view scores, DSA roadmap, and skill gaps."
                  : "Upload your resume to calculate your campus placement readiness and ATS score."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {resumeText ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-4 py-2 text-xs font-black text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Icon name="file" className="h-3.5 w-3.5" /> Preview Resume
                  </button>
                  <Magnetic strength={0.2}>
<button
                    type="button"
                    onClick={handleRunAll}
                    disabled={analysesRunning}
                    title={analysesRunning ? "Analyses already running" : undefined}
                    className={`rounded-xl px-4 py-2 text-xs font-black text-white shadow-md transition-all active:scale-95 cursor-pointer ${
                      analysesRunning
                        ? "bg-primary-600/60 cursor-not-allowed"
                        : "bg-primary-600 hover:bg-primary-700"
                    }`}
                  >
                    <Icon name="bolt" className="h-3.5 w-3.5" /> {analysesRunning ? "Analyses Running..." : "Run All Analyses"}
                  </button>
                  </Magnetic>
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-4 py-2 text-xs font-bold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-card,#ffffff)] shadow-2xs transition-all cursor-pointer"
                  >
                    Replace Resume
                  </button>
                  {hasSavedResume && (
                    <button
                      type="button"
                      onClick={handleDeleteResume}
                      className="rounded-xl border border-red-500/30 bg-[var(--theme-card,#ffffff)] px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-500/10 shadow-2xs transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="rounded-xl bg-primary-600 px-6 py-3 text-xs font-black text-white shadow-md hover:bg-primary-700 transition-all active:scale-95 cursor-pointer"
                >
                  <Icon name="upload" className="h-3.5 w-3.5" /> Upload Resume to Begin
                </button>
              )}
            </div>
          </div>

          {/* Live metrics strip */}
          {resumeText && <HeroMetrics score={readyScore} sectionsReady={sectionsReady} totalSections={totalSections} />}
        </SpotlightCard>

        <SessionBar role={ROLES.STUDENT} sessionId={sessionMeta.id} name={sessionMeta.name} />

        <EmailVerificationBanner user={user} onVerify={sendVerificationEmail} />

        {resumeText && (
          <nav
            aria-label="Analysis sections"
            className="sticky top-16 z-20 -mx-4 sm:-mx-6 border-b border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)]/95 px-4 py-2.5 backdrop-blur-md sm:px-6 shadow-xs rounded-2xl"
          >
            <div className="flex gap-1.5 overflow-x-auto">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleScrollTo(item.id)}
                  className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                    activeSection === item.id
                      ? "bg-primary-600 text-white shadow-xs font-black"
                      : "text-[var(--theme-text-muted,#475569)] hover:bg-[var(--theme-bg)]/85 hover:text-[var(--theme-text,#0f172a)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        )}

        <ResumeParser
          resumeText={resumeText}
          onResumeTextChange={setResumeText}
          onUpload={handleUploadClick}
        />

        {resumeText ? (
          <div className="space-y-10">
            <ResumeAnalyzer resumeText={resumeText} />
            <ReadinessScore resumeText={resumeText} />
            <TargetRoleSwitcher resumeText={resumeText} />

            <Suspense fallback={<SkeletonCard />}>
              <SkillDistributionChart resumeText={resumeText} />
            </Suspense>

            <SkillsGap resumeText={resumeText} />
            <ResumeImprovements resumeText={resumeText} />
            <RecommendedContent resumeText={resumeText} />
            <Roadmap resumeText={resumeText} />
            <DSARecommend resumeText={resumeText} />
            <InterviewPrep resumeText={resumeText} />
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-10 text-center shadow-xs">
            <p className="text-sm font-semibold text-[var(--theme-text-muted,#475569)]">
              Upload your resume to unlock personalized career insights — readiness score, skill
              gaps, roadmap, DSA plan, interview prep, and certifications with course links.
            </p>
            <button
              type="button"
              onClick={handleUploadClick}
              className="mt-6 rounded-xl bg-primary-600 px-6 py-3 text-xs font-black text-white shadow-md hover:bg-primary-700 transition-all active:scale-95 cursor-pointer"
            >
              <Icon name="upload" className="h-3.5 w-3.5" /> Upload Your Resume Now
            </button>
          </div>
        )}
      </main>

      {verifyGateOpen && (
        <VerifyGateModal
          onClose={() => setVerifyGateOpen(false)}
          onResend={() => sendVerificationEmail(user)}
          onContinue={() => {
            setVerifyGateOpen(false);
            dispatchRunAnalyses(resumeText);
          }}
        />
      )}

      {/* Interactive Resume Preview Modal */}
      <StudentResumePreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        profile={user}
        score={85}
      />
    </div>
  );
}
