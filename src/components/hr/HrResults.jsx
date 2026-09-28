import { useState, useMemo } from "react";
import Icon from "../ui/Icon";
import HrTable from "./HrTable";
import HrChatPanel from "./HrChatPanel";
import CopilotAuditLog from "./CopilotAuditLog";
import CompareModal from "./CompareModal";
import TiltCard3D from "../ui/TiltCard3D";
import CountUp from "../ui/CountUp";
import KanbanBoard from "./KanbanBoard";
import LeaderboardHero from "./LeaderboardHero";
import { generateCandidatesCsv } from "../../services/hrScoring";

/* Ring tone per metric value — mirrors the table's score coloring. */
function ringTone(value) {
  if (value >= 75) return "#4B87F5"; // primary-300
  if (value >= 50) return "#1257C4"; // shortlist-300
  return "#DC2626"; // red-400
}

/**
 * RingGauge — SVG progress ring (stroke-dasharray/dashoffset), the same
 * technique as ScoreGauge3D. Starts empty and animates to `value`%.
 */
function RingGauge({ value, size = 44, stroke = 4, color = "#4B87F5", children, className = "" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const offset = c * (1 - clamped / 100);
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(250, 248, 245, 0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s" }}
        />
      </svg>
      {children != null && (
        <span className="absolute inset-0 flex items-center justify-center">{children}</span>
      )}
    </span>
  );
}

/**
 * MetricTile — engraved glass tile with a conic progress ring that fills
 * to the metric's value, then a count-up digit inside. Non-numeric
 * metrics (names, counts) render as plain display text.
 */
function MetricTile({ label, value, subtext, tone }) {
  const numeric = typeof value === "number" ? value : null;
  const pctMatch = typeof value === "string" ? value.match(/^(\d+)%$/) : null;
  const pct = pctMatch ? Number(pctMatch[1]) : numeric;
  const valueColor =
    tone === "strong"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-shortlist-700"
        : "text-[var(--theme-text)]";

  return (
    <TiltCard3D
      maxTilt={5}
      className="ht-crest ht-engraved rounded-2xl border border-[var(--theme-border)] px-5 py-4 shadow-2xs hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-black text-[var(--theme-text-muted)] uppercase tracking-[0.14em]">
            {label}
          </div>
          <div className={`ht-digit mt-1.5 text-3xl font-black font-mono tracking-tight ${valueColor}`}>
            {pct != null ? (
              <>
                <CountUp value={pct} duration={1100} />
                {pctMatch ? "%" : ""}
              </>
            ) : (
              value
            )}
          </div>
          {subtext && (
            <div className="mt-1 truncate text-[12px] font-semibold text-[var(--theme-text-muted)]">
              {subtext}
            </div>
          )}
        </div>
        {/* Rings only for true percentage metrics — a count of 4 isn't 4% */}
        {pctMatch != null && <RingGauge value={pct} color={ringTone(pct)} className="mt-1" />}
      </div>
    </TiltCard3D>
  );
}

/* Segmented view switch with a sliding highlight. */
function ViewSwitch({ viewMode, setViewMode }) {
  const options = [
    { id: "table", label: "Ranked List", icon: "clipboard" },
    { id: "kanban", label: "Pipeline", icon: "chart" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Results view"
      className="relative flex items-center rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)]/70 p-1 backdrop-blur-md shadow-2xs"
    >
      {options.map((opt) => {
        const active = viewMode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setViewMode(opt.id)}
            className={`relative z-10 flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              active ? "text-white" : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]"
            }`}
          >
            {active && (
              <span className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 shadow-md shadow-primary-600/25" />
            )}
            <Icon name={opt.icon} className="h-3.5 w-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function HrResults({ session, sessionId, onToggleShortlist, onUpdateStatus, onApplyShortlist, onUndoShortlist }) {
  const [viewMode, setViewMode] = useState("table"); // "table" | "kanban"
  const [filterMode, setFilterMode] = useState("all"); // "all" | "top" | "shortlist"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [compareOpen, setCompareOpen] = useState(false);

  if (!session?.candidates?.length) return null;

  const candidates = session.candidates;
  const avg =
    candidates.length > 0
      ? Math.round(
          candidates.reduce((sum, c) => sum + (c.scores?.total ?? c.scores?.overall ?? 0), 0) /
            candidates.length
        )
      : 0;
  const top =
    [...candidates].sort(
      (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER)
    )[0] || candidates[0];
  const topName = top?.evaluation?.name || top?.fileName || "—";
  const failed = session.summary?.failed || 0;
  const shortlistedCount = candidates.filter((c) => c.shortlisted).length;
  const topTierCount = candidates.filter((c) => (c.scores?.total ?? c.scores?.overall ?? 0) >= 80).length;

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const overall = c.scores?.total ?? c.scores?.overall ?? 0;
      const matchesSearch =
        !searchQuery.trim() ||
        (c.evaluation?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.fileName || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (filterMode === "shortlist") return c.shortlisted;
      if (filterMode === "top") return overall >= 80;
      return true;
    });
  }, [candidates, filterMode, searchQuery]);

  const compareCandidates = candidates.filter((c) => selectedIds.has(c.id));

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenCompare = () => {
    if (compareCandidates.length >= 2) setCompareOpen(true);
  };

  const handleExportCsv = () => {
    const csvContent = generateCandidatesCsv(candidates);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidate-evaluation-results-${sessionId || "export"}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const filterTabs = [
    { id: "all", label: `All (${candidates.length})`, icon: null, activeClass: "from-primary-600 to-primary-500 text-white shadow-md shadow-primary-600/20" },
    { id: "top", label: `Top Matches (${topTierCount})`, icon: "star", activeClass: "from-primary-600 to-primary-500 text-white shadow-md shadow-primary-600/20" },
    { id: "shortlist", label: `Shortlisted (${shortlistedCount})`, icon: "crown", activeClass: "from-shortlist-500 to-shortlist-600 text-white shadow-md shadow-shortlist-500/25" },
  ];

  return (
    <section className="ht-sweep space-y-6">
      {/* ── Section header ─────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-6 items-center rounded-full border border-primary-400/30 bg-primary-500/10 px-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-primary-600">
            Results
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-[var(--theme-border)] to-transparent" />
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-black leading-tight tracking-tight text-[var(--theme-text)]">
              Candidate <span className="text-primary-600">Leaderboard</span>
            </h2>
            <p className="mt-1 text-sm font-medium text-[var(--theme-text-muted)]">
              {candidates.length} resume{candidates.length === 1 ? "" : "s"} ranked against your job criteria
              {failed > 0 ? ` · ${failed} could not be parsed` : ""}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitch viewMode={viewMode} setViewMode={setViewMode} />
            <button
              type="button"
              onClick={handleExportCsv}
              className="ht-engraved rounded-2xl border border-[var(--theme-border)] px-4 py-2 text-xs font-bold text-[var(--theme-text-muted)] hover:border-accent-300/50 hover:text-accent-600 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Icon name="download" className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Metric tiles ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricTile label="Total Candidates" value={candidates.length} subtext="Parsed on this device" />
        <MetricTile label="Average Match" value={`${avg}%`} tone={avg >= 75 ? "strong" : "default"} subtext="Job score baseline" />
        <MetricTile label="Top Match" value={topName} subtext={`#1 Rank · ${top?.scores?.total ?? top?.scores?.overall ?? 0}%`} />
        <MetricTile
          label="Failed Parses"
          value={failed}
          tone={failed > 0 ? "warn" : "strong"}
          subtext={failed === 0 ? "100% successful" : "Format warnings"}
        />
      </div>

      {/* ── Leaderboard hero (top-3) ───────────────────────── */}
      {candidates.length >= 3 && (
        <LeaderboardHero
          candidates={candidates}
          sessionId={sessionId}
          onToggleShortlist={onToggleShortlist}
        />
      )}

      {/* ── Filter rail + search ───────────────────────────── */}
      <div className="ht-engraved rounded-2xl border border-[var(--theme-border)] p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {filterTabs.map((tab) => {
            const active = filterMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? `bg-gradient-to-r ${tab.activeClass}`
                    : "border border-[var(--theme-border)] bg-[var(--theme-card)]/60 text-[var(--theme-text-muted)] hover:bg-[#0B1F3A]/[0.04]"
                }`}
              >
                {tab.icon && <Icon name={tab.icon} className="mr-1 inline h-3.5 w-3.5 -mt-0.5" />}
                {tab.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleOpenCompare}
            disabled={compareCandidates.length < 2}
            className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all shadow-2xs ${
              compareCandidates.length >= 2
                ? "border-accent-300/50 bg-accent-50 text-accent-600 hover:bg-accent-100 active:scale-95 cursor-pointer"
                : "border-[var(--theme-border)] bg-[var(--theme-card)]/60 text-[var(--theme-text-muted)] opacity-50 cursor-not-allowed"
            }`}
          >
            <Icon name="chart" className="mr-1 inline h-3.5 w-3.5 -mt-0.5" /> Compare ({compareCandidates.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--theme-text-muted)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate or file…"
            aria-label="Search candidates"
            className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)]/60 pl-9 pr-3 py-2 text-xs font-medium text-[var(--theme-text)] focus:outline-none focus:border-primary-400 focus:bg-[var(--theme-card)] transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* ── Ranked list + copilot, or kanban board ─────────── */}
      {viewMode === "table" ? (
        <div id="hr-results" className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <HrTable
              candidates={filteredCandidates}
              sessionId={sessionId}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleShortlist={onToggleShortlist}
            />
            {session.copilotAudit?.length > 0 && (
              <CopilotAuditLog entries={session.copilotAudit} onUndo={onUndoShortlist} />
            )}
          </div>
          <HrChatPanel
            rules={session.config?.rules}
            keywords={session.expandedKeywords}
            candidates={candidates}
            onApplyShortlist={onApplyShortlist}
            onUndoShortlist={onUndoShortlist}
          />
        </div>
      ) : (
        <KanbanBoard
          candidates={filteredCandidates}
          sessionId={sessionId}
          onToggleShortlist={onToggleShortlist}
          onUpdateStatus={onUpdateStatus}
        />
      )}

      {compareOpen && (
        <CompareModal
          candidates={compareCandidates}
          sessionId={sessionId}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </section>
  );
}
