import { useEffect, useState } from "react";
import Icon from "../components/ui/Icon";
import { useParams, Link, useSearchParams } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader";
import Seo from "../components/Seo";
import RadarChart from "../components/charts/RadarChart";
import JourneyTimeline from "../components/hr/JourneyTimeline";
import TugOfWar from "../components/ui/TugOfWar";
import CountUp from "../components/ui/CountUp";
import { loadCandidates, saveCandidates } from "../services/hrStore";
import { getSession, putSession } from "../services/sessionStore";
import { getFileExtension } from "../services/fileParser";

function scoreColor(value) {
  if (value >= 75) return "text-primary-700";
  if (value >= 50) return "text-shortlist-700";
  return "text-red-600";
}

function barColor(value) {
  if (value >= 75) return "bg-primary-500";
  if (value >= 50) return "bg-shortlist-400";
  return "bg-red-500";
}

/** Overall-fit band — sober light-tone chips matching the app's HR surfaces. */
function matchBand(score) {
  const c = Math.max(0, Math.min(100, Number(score) || 0));
  if (c >= 80) {
    return {
      label: "Top match",
      pill: "border-primary-200 bg-primary-50 text-primary-700",
      value: "text-primary-700",
    };
  }
  if (c >= 65) {
    return {
      label: "Strong match",
      pill: "border-accent-200 bg-accent-50 text-accent-700",
      value: "text-accent-700",
    };
  }
  if (c >= 50) {
    return {
      label: "Moderate match",
      pill: "border-shortlist-200 bg-shortlist-100 text-shortlist-700",
      value: "text-shortlist-700",
    };
  }
  return {
    label: "Needs review",
    pill: "border-red-200 bg-red-50 text-red-700",
    value: "text-red-700",
  };
}

function Chip({ children, tone = "default", onClick }) {
  const tones = {
    default:
      "border-[var(--theme-border)] bg-[var(--theme-card)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)]/60",
    skill: "border-accent-200 bg-accent-50 text-accent-700 hover:border-accent-300 hover:bg-accent-100",
    matched: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    missing: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold transition-all select-none ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Panel({ kicker, title, subtitle, className = "", children }) {
  return (
    <section
      className={`rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)]/80 p-6 sm:p-7 shadow-sm transition-colors duration-300 ${className}`}
    >
      {(kicker || title) && (
        <div className="mb-5">
          {kicker && (
            <div className="mb-1.5 flex items-center gap-2">
              <span className="h-px w-4 bg-primary-500/70" />
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-primary-600">
                {kicker}
              </span>
            </div>
          )}
          {title && (
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-[var(--theme-text)]">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-1 text-xs font-medium text-[var(--theme-text-muted)]">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

function slugLabel(key) {
  const raw = String(key || "");
  return raw.length ? raw.charAt(0).toUpperCase() + raw.slice(1).replace(/[_-]+/g, " ") : raw;
}

const DIMENSIONS = [
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "projects", label: "Projects" },
  { key: "keywordMatch", label: "Keyword Match" },
];

export default function CandidateView() {
  const { candidateId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const urlTab = searchParams.get("tab");
  const backHref = sessionId ? `/hr?session=${sessionId}` : "/hr";
  const [candidate, setCandidate] = useState(null);
  const activeTab = urlTab || "overview";

  const handleTabChange = (tabId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tabId);
    setSearchParams(nextParams, { replace: true });
  };
  const [showText, setShowText] = useState(false);
  const [pdfBroken, _setPdfBroken] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [docxHtml, setDocxHtml] = useState(null);
  const [docxLoading, setDocxLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fromStorage = loadCandidates().find((c) => c.id === candidateId) || null;
    if (fromStorage) {
      setCandidate(fromStorage);
      setShortlisted(Boolean(fromStorage?.shortlisted));
      return undefined;
    }
    if (sessionId) {
      getSession(sessionId).then((record) => {
        if (cancelled) return;
        const list = record?.payload?.candidates;
        const found = Array.isArray(list) ? list.find((c) => c.id === candidateId) || null : null;
        setCandidate(found);
        setShortlisted(Boolean(found?.shortlisted));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [candidateId, sessionId]);

  const loadDocxPreview = async () => {
    if (docxHtml || docxLoading || !candidate?.url) return;
    setDocxLoading(true);
    try {
      const mod = await import("mammoth");
      const mammoth = mod.default || mod;
      const arrayBuffer = await fetch(candidate.url).then((r) => r.arrayBuffer());
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setDocxHtml(result.value || "<p>No preview available.</p>");
    } catch {
      setDocxHtml("<p>Could not render this document in the browser.</p>");
    } finally {
      setDocxLoading(false);
    }
  };

  useEffect(() => {
    if (!candidate) return;
    const ext = getFileExtension(candidate.fileName);
    if (ext === "docx" && !showText && !docxHtml && !docxLoading) loadDocxPreview();
  }, [candidate?.id, candidate?.url, showText]);

  if (!candidate) {
    return (
      <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
        <Seo title="Candidate Not Found" description="This candidate evaluation is no longer available." noindex />
        <DashboardHeader />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)]/95 p-10 shadow-sm">
            <span className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary-50 text-primary-600">
              <Icon name="user" className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-2xl font-black text-[var(--theme-text)]">Candidate data not found</h1>
            <p className="mt-2 text-sm text-[var(--theme-text-muted)] font-medium">
              This evaluation is no longer available in this browser session. Re-run the analysis from the HR workspace.
            </p>
            <Link
              to={backHref}
              className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-700 transition-all shadow-xs"
            >
              &larr; Back to HR Workspace
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const evaluation = candidate.evaluation || {};
  const scores = candidate.scores || {};
  const overall = scores.total ?? scores.overall ?? 0;
  const band = matchBand(overall);
  const sections = evaluation.sections || {};
  const sectionEntries = Object.entries(sections);
  const fileExt = getFileExtension(candidate.fileName);
  const isPdf = /pdf/i.test(candidate.fileType || "") || fileExt === "pdf";
  const isDocx = fileExt === "docx";
  const pdfAvailable = isPdf && Boolean(candidate.url) && !pdfBroken;
  const docxAvailable = isDocx && Boolean(candidate.url) && !pdfBroken;
  const effectiveShowText = showText || (!pdfAvailable && !docxAvailable);

  const dimScores = DIMENSIONS.map((dim) => ({
    key: dim.key,
    label: dim.label,
    value: Number(scores[dim.key]),
  }));
  const gradedAxes = dimScores.filter((d) => Number.isFinite(d.value));
  const avgAxes = gradedAxes.length
    ? Math.round(gradedAxes.reduce((sum, d) => sum + d.value, 0) / gradedAxes.length)
    : 0;

  const keywordTotal =
    (evaluation.matchedKeywords?.length || 0) + (evaluation.missingKeywords?.length || 0);

  const handleExport = () => {
    const lines = [
      `# Candidate Report — ${evaluation.name || candidate.fileName}`,
      `File: ${candidate.fileName}`,
      `Rank: #${candidate.rank ?? "—"} | Overall Match: ${overall}%`,
      ``,
      `## Score Breakdown`,
      ...DIMENSIONS.map((dim) => `- ${dim.label}: ${scores[dim.key] ?? "—"}%`),
      ``,
      evaluation.headline ? `## Headline\n${evaluation.headline}\n` : "",
      evaluation.skills?.length ? `## Skills\n${evaluation.skills.join(", ")}\n` : "",
      evaluation.matchedKeywords?.length
        ? `## Matched Keywords\n${evaluation.matchedKeywords.join(", ")}\n`
        : "",
      evaluation.missingKeywords?.length
        ? `## Missing Keywords\n${evaluation.missingKeywords.join(", ")}\n`
        : "",
      evaluation.strengths?.length
        ? `## Strengths\n${evaluation.strengths.map((s) => `- ${s}`).join("\n")}\n`
        : "",
      evaluation.concerns?.length
        ? `## Concerns\n${evaluation.concerns.map((c) => `- ${c}`).join("\n")}\n`
        : "",
      evaluation.rationale ? `## Rationale\n${evaluation.rationale}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const blob = new Blob([lines], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${evaluation.name || candidate.fileName || "candidate"}-report.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const openResume = () => {
    if (candidate?.url) window.open(candidate.url, "_blank", "noopener");
  };

  const handleToggleShortlist = async () => {
    const next = !shortlisted;
    setShortlisted(next);
    const list = loadCandidates().map((c) =>
      c.id === candidateId ? { ...c, shortlisted: next } : c
    );
    saveCandidates(list);
    if (sessionId) {
      const record = await getSession(sessionId);
      if (record) {
        const payload = record.payload || {};
        const candidates = (payload.candidates || []).map((c) =>
          c.id === candidateId ? { ...c, shortlisted: next } : c
        );
        await putSession({ ...record, payload: { ...payload, candidates } });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] pb-16 transition-colors duration-300">
      <Seo
        title={`${evaluation.name || candidate.fileName} — Candidate Report`}
        description={`AI evaluation for ${evaluation.name || candidate.fileName}: ${overall}% overall match, ranked #${candidate.rank ?? "—"}.`}
        noindex
      />
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-7">
        {/* Navigation & action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={backHref}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-3.5 py-2 text-xs font-extrabold text-[var(--theme-text)] hover:bg-[var(--theme-bg)] transition-all"
          >
            &larr; Back to Hiring Session
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleShortlist}
              title={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                shortlisted
                  ? "border-shortlist-400/60 bg-shortlist-500/15 text-shortlist-700"
                  : "border-[var(--theme-border)] bg-[var(--theme-card)] text-[var(--theme-text)] hover:bg-[var(--theme-bg)]"
              }`}
            >
              <Icon name="star" className={`h-4 w-4 ${shortlisted ? "text-shortlist-500" : "text-[var(--theme-text-muted)]"}`} />
              {shortlisted ? "Shortlisted Candidate" : "Add to Shortlist"}
            </button>

            {pdfAvailable && (
              <button
                type="button"
                onClick={openResume}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-2 text-xs font-bold text-[var(--theme-text)] hover:bg-[var(--theme-bg)] transition-all cursor-pointer active:scale-95"
              >
                <Icon name="file" className="h-4 w-4" /> Open Original Resume
              </button>
            )}

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700 transition-all cursor-pointer active:scale-95"
            >
              <Icon name="download" className="h-4 w-4" /> Export Markdown Report
            </button>
          </div>
        </div>

        {/* Report masthead */}
        <header className="relative overflow-hidden rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)]/80 shadow-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-primary-500/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -left-24 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl"
          />
          <div className="relative p-6 sm:p-9">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              {/* Identity */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-primary-700">
                    <Icon name="chart" className="h-3.5 w-3.5" /> Candidate Report
                  </span>
                  {candidate.rank === 1 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-shortlist-300/60 bg-shortlist-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-shortlist-700">
                      <Icon name="star" className="h-3.5 w-3.5" /> Top Ranked
                    </span>
                  )}
                  {shortlisted && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-shortlist-300/70 bg-shortlist-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-shortlist-700">
                      <Icon name="star" className="h-3.5 w-3.5" /> Shortlisted
                    </span>
                  )}
                </div>

                <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-[var(--theme-text)]">
                  {evaluation.name || candidate.fileName}
                </h1>

                {evaluation.headline && (
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[var(--theme-text-muted)]">
                    {evaluation.headline}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-[var(--theme-text-muted)]">
                  {evaluation.email && (
                    <span className="flex items-center gap-1.5">
                      <Icon name="mail" className="h-3.5 w-3.5" /> {evaluation.email}
                    </span>
                  )}
                  {evaluation.phone && (
                    <span className="flex items-center gap-1.5">
                      <Icon name="phone" className="h-3.5 w-3.5" /> {evaluation.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 font-mono text-[12px]">
                    <Icon name="folder" className="h-3.5 w-3.5" /> {candidate.fileName}
                  </span>
                </div>

                {evaluation.skills?.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {evaluation.skills.slice(0, 8).map((skill, i) => (
                      <Chip key={i} tone="skill">
                        {skill}
                      </Chip>
                    ))}
                    {evaluation.skills.length > 8 && (
                      <span className="self-center text-xs font-bold text-[var(--theme-text-muted)]">
                        +{evaluation.skills.length - 8} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Overall match stat block */}
              <aside className="shrink-0 md:w-60 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--theme-text-muted)]">
                    Overall Match
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${band.pill}`}>
                    {band.label}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className={`text-5xl font-black tracking-tight ${band.value}`}>
                    <CountUp value={overall} delay={200} />
                  </span>
                  <span className="text-xl font-bold text-[var(--theme-text-muted)]">%</span>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-[var(--theme-border)] pt-4">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Rank</dt>
                    <dd className="text-sm font-black text-[var(--theme-text)]">#{candidate.rank ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Tier</dt>
                    <dd className="text-sm font-black text-[var(--theme-text)]">{band.label}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Format</dt>
                    <dd className="text-sm font-black font-mono text-[var(--theme-text)]">
                      {(fileExt || "txt").toUpperCase()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Scored by</dt>
                    <dd className="text-sm font-black text-[var(--theme-text)]">AI</dd>
                  </div>
                </dl>
              </aside>
            </div>
          </div>
        </header>

        {/* Journey timeline */}
        <JourneyTimeline candidate={candidate} />

        {/* Tabbed navigation */}
        <div
          role="tablist"
          aria-label="Candidate evaluation views"
          className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)]/70 p-1.5 shadow-2xs flex flex-wrap gap-1.5"
        >
          {[
            { id: "overview", label: ["chart", "Overview"], count: null },
            {
              id: "skills",
              label: ["bolt", "Skills & Keywords"],
              count: (evaluation.skills?.length || 0) + (evaluation.matchedKeywords?.length || 0),
            },
            {
              id: "assessment",
              label: ["bulb", "Assessment"],
              count: (evaluation.strengths?.length || 0) + (evaluation.concerns?.length || 0),
            },
            { id: "resume", label: ["docStack", "Resume"], count: null },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isSelected}
                aria-controls={`panel-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-extrabold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  isSelected
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-card)]"
                }`}
              >
                <Icon name={tab.label[0]} className="mr-1.5 inline h-3.5 w-3.5 -mt-0.5" />
                {tab.label[1]}
                {tab.count !== null ? ` (${tab.count})` : ""}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-6">
              <Panel
                kicker="Scores"
                title="Dimensional breakdown"
                subtitle="How this resume scored on each evaluation axis."
              >
                <div className="divide-y divide-[var(--theme-border)]">
                  {dimScores.map((dim) => (
                    <div key={dim.key} className="py-3.5 first:pt-0 last:pb-0">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold capitalize text-[var(--theme-text)]">{dim.label}</span>
                        <span className={`font-mono text-sm font-black ${Number.isFinite(dim.value) ? scoreColor(dim.value) : "text-[var(--theme-text-muted)]"}`}>
                          {Number.isFinite(dim.value) ? `${dim.value}%` : "—%"}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--theme-border)]/70">
                        <div
                          className={`h-full rounded-full ${barColor(dim.value)} transition-all duration-700 ease-out`}
                          style={{ width: `${Number.isFinite(dim.value) ? dim.value : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[var(--theme-border)] pt-3.5 text-xs font-bold text-[var(--theme-text-muted)]">
                  <span>Average across graded axes</span>
                  <span className="font-black font-mono text-[var(--theme-text)]">{avgAxes}%</span>
                </div>
              </Panel>

              {sectionEntries.length > 0 && (
                <Panel
                  kicker="Structure"
                  title="Resume depth"
                  subtitle="Signal quality per section of the source document."
                >
                  <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                    {sectionEntries.map(([key, section]) => (
                      <div key={key}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold capitalize text-[var(--theme-text)]">{slugLabel(key)}</span>
                          <span className={`font-mono text-xs font-black ${scoreColor(section?.quality)}`}>
                            {section?.quality != null ? `${section?.quality}%` : "—%"}
                          </span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--theme-border)]/70">
                          <div
                            className={`h-full rounded-full ${barColor(section?.quality)} transition-all duration-700 ease-out`}
                            style={{ width: `${Number(section?.quality) || 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
            </div>

            <div className="lg:col-span-5">
              <Panel
                kicker="Profile"
                title="Competency profile"
                subtitle="Five evaluation axes plotted against the target-role baseline."
              >
                <RadarChart
                  labels={DIMENSIONS.map((dim) => dim.label)}
                  values={DIMENSIONS.map((dim) => scores[dim.key])}
                  size={316}
                  showRankBadge={false}
                />
              </Panel>
            </div>
          </div>
        )}

        {/* Tab 2: Skills & Keywords */}
        {activeTab === "skills" && (
          <div id="panel-skills" role="tabpanel" aria-labelledby="tab-skills" className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <Panel
              kicker="Skills"
              title="Extracted technical skills"
              subtitle="Technical competencies, tools, and platforms detected in this resume."
            >
              <div className="flex flex-wrap gap-2">
                {(evaluation.skills || []).map((skill, i) => (
                  <Chip key={i} tone="skill">
                    {skill}
                  </Chip>
                ))}
                {!evaluation.skills?.length && (
                  <p className="text-sm font-medium text-[var(--theme-text-muted)]">
                    No skills extracted from this document.
                  </p>
                )}
              </div>
            </Panel>

            <Panel
              kicker="Keywords"
              title="Job keyword fit"
              subtitle="Exact and semantic alignment with the target role requirements."
            >
              <TugOfWar
                left={{
                  label: "Matched",
                  value: keywordTotal > 0 ? Math.round(((evaluation.matchedKeywords?.length || 0) / keywordTotal) * 100) : 0,
                }}
                right={{
                  label: "Missing",
                  value: keywordTotal > 0 ? Math.round(((evaluation.missingKeywords?.length || 0) / keywordTotal) * 100) : 0,
                }}
              />

              <div className="mt-6">
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                    Matched keywords
                  </h4>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-700">
                    {evaluation.matchedKeywords?.length || 0}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(evaluation.matchedKeywords || []).map((kw, i) => (
                    <Chip key={i} tone="matched">
                      ✓ {kw}
                    </Chip>
                  ))}
                  {!evaluation.matchedKeywords?.length && (
                    <span className="text-xs font-medium text-[var(--theme-text-muted)]">
                      No direct keyword matches detected.
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-100 text-red-700">
                    <Icon name="alert" className="h-3 w-3" />
                  </span>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-red-700">
                    Missing target keywords
                  </h4>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-black text-red-700">
                    {evaluation.missingKeywords?.length || 0}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(evaluation.missingKeywords || []).map((kw, i) => (
                    <Chip key={i} tone="missing">
                      ✕ {kw}
                    </Chip>
                  ))}
                  {!evaluation.missingKeywords?.length && (
                    <span className="text-xs font-bold text-emerald-700">
                      Great fit — no critical keywords missing.
                    </span>
                  )}
                </div>
              </div>
            </Panel>
          </div>
        )}

        {/* Tab 3: Assessment */}
        {activeTab === "assessment" && (
          <div id="panel-assessment" role="tabpanel" aria-labelledby="tab-assessment" className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <Panel
              kicker="Strengths"
              title="Why they fit"
              subtitle="Areas where the candidate meets or exceeds the job criteria."
            >
              <ul className="space-y-3">
                {(evaluation.strengths || []).map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-medium text-[var(--theme-text)]"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Icon name="check" className="h-3 w-3" />
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
                {!evaluation.strengths?.length && (
                  <p className="text-xs font-medium text-[var(--theme-text-muted)]">
                    No specific strengths recorded.
                  </p>
                )}
              </ul>
            </Panel>

            <div className="space-y-6">
              <Panel
                kicker="Concerns"
                title="Areas to verify"
                subtitle="Things worth checking in an interview or reference call."
              >
                <ul className="space-y-3">
                  {(evaluation.concerns || []).map((c, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 rounded-2xl border border-shortlist-200 bg-shortlist-100 p-3.5 text-sm font-medium text-[var(--theme-text)]"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-shortlist-100 text-shortlist-700">
                        <Icon name="alert" className="h-3 w-3" />
                      </span>
                      <span>{c}</span>
                    </li>
                  ))}
                  {!evaluation.concerns?.length && (
                    <p className="text-xs font-bold text-emerald-700">No red flags or notable concerns detected.</p>
                  )}
                </ul>
              </Panel>

              {evaluation.rationale && (
                <Panel
                  kicker="Summary"
                  title="AI evaluation rationale"
                  subtitle="Synthesis produced by the evaluation model."
                >
                  <blockquote className="rounded-r-2xl border-l-2 border-primary-500/60 bg-[var(--theme-bg)] py-4 pl-5 pr-4 text-sm font-medium leading-relaxed text-[var(--theme-text)]">
                    {evaluation.rationale}
                  </blockquote>
                </Panel>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Resume document viewer */}
        {activeTab === "resume" && (
          <Panel
            kicker="Document"
            title="Resume document preview"
            subtitle={`Original uploaded file: ${candidate.fileName}`}
          >
            {(pdfAvailable || docxAvailable) && (
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowText(false)}
                  className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    !effectiveShowText
                      ? "border-primary-300 bg-primary-50 text-primary-700"
                      : "border-[var(--theme-border)] bg-[var(--theme-card)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)]"
                  }`}
                >
                  Document View
                </button>
                <button
                  type="button"
                  onClick={() => setShowText(true)}
                  className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    effectiveShowText
                      ? "border-primary-300 bg-primary-50 text-primary-700"
                      : "border-[var(--theme-border)] bg-[var(--theme-card)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)]"
                  }`}
                >
                  Extracted Raw Text
                </button>
              </div>
            )}

            {!effectiveShowText && pdfAvailable ? (
              <iframe
                src={candidate.url}
                title="Resume PDF"
                className="h-[70vh] w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)]"
              />
            ) : !effectiveShowText && docxAvailable ? (
              <div
                className="h-[70vh] overflow-auto rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-6 text-xs leading-relaxed text-[var(--theme-text)] docx-preview"
                dangerouslySetInnerHTML={{ __html: docxHtml || "<p>Rendering document preview...</p>" }}
              />
            ) : (
              <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-5 text-xs leading-relaxed text-[var(--theme-text)] font-mono">
                {candidate.resumeText || "No extracted resume text available."}
              </pre>
            )}
          </Panel>
        )}
      </main>
    </div>
  );
}