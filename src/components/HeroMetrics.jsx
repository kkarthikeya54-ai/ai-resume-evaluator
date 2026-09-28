import CountUp from "./ui/CountUp";

/**
 * HeroMetrics — the student report-card hero's live metric strip.
 * Replaces the old hardcoded placeholder bar (85% / "3 Topics") with real
 * values: the actual readiness score once calculated, a staged progress
 * meter across the analysis sections, and an honest run status.
 */
export default function HeroMetrics({ score = null, sectionsReady = 0, totalSections = 0 }) {
  const hasScore = score != null;
  const done = Math.max(0, Math.min(totalSections, sectionsReady));
  const allDone = totalSections > 0 && done >= totalSections;
  const pct = totalSections ? Math.round((done / totalSections) * 100) : 0;

  const scoreTone = !hasScore
    ? "text-[var(--theme-text-muted,#64748b)]"
    : score >= 75
      ? "text-emerald-600"
      : score >= 50
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-[var(--theme-border,#e2e8f0)]">
      {/* Live readiness score */}
      <div className="rounded-2xl bg-[var(--theme-bg)]/85 border border-[var(--theme-border,#e2e8f0)] p-3.5 text-center">
        <span className="text-xs font-bold text-[var(--theme-text-muted,#475569)] block">Readiness Score</span>
        {hasScore ? (
          <span className={`text-xl font-black ${scoreTone}`}>
            <CountUp value={score} duration={1100} />%
          </span>
        ) : (
          <span className="text-xl font-black text-[var(--theme-text-muted,#64748b)]" title="Run the analyses to calculate your score">—</span>
        )}
      </div>

      {/* Staged analysis meter */}
      <div className="rounded-2xl bg-[var(--theme-bg)]/85 border border-[var(--theme-border,#e2e8f0)] p-3.5 text-center">
        <span className="text-xs font-bold text-[var(--theme-text-muted,#475569)] block">Analyses Ready</span>
        <span className="text-xl font-black text-[var(--theme-text,#0f172a)]">
          {done}
          <span className="text-sm font-bold text-[var(--theme-text-muted,#64748b)]">/{totalSections}</span>
        </span>
        <span className="report-hero__meter mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-[var(--theme-border,#e2e8f0)]">
          <span
            className={`report-hero__meter-bar block h-full rounded-full ${allDone ? "report-hero__meter-bar--done" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </span>
      </div>

      {/* Honest status chip */}
      <div className="rounded-2xl bg-[var(--theme-bg)]/85 border border-[var(--theme-border,#e2e8f0)] p-3.5 text-center">
        <span className="text-xs font-bold text-[var(--theme-text-muted,#475569)] block">Status</span>
        <span
          className={`text-xs font-black px-2.5 py-0.5 rounded-full inline-block mt-1 border ${
            allDone
              ? "text-emerald-700 bg-emerald-500/15 border-emerald-500/30"
              : done > 0
                ? "text-amber-700 bg-amber-500/15 border-amber-500/30"
                : "text-[var(--theme-text-muted,#64748b)] bg-[var(--theme-card,#ffffff)] border-[var(--theme-border,#e2e8f0)]"
          }`}
        >
          {allDone ? "Report Complete" : done > 0 ? "Analysis Running" : "Not Started"}
        </span>
      </div>
    </div>
  );
}
