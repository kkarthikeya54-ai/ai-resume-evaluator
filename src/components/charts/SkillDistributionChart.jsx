import { useEffect } from "react";
import Icon from "../ui/Icon";
import { useGemini } from "../../hooks/useGemini";
import { subscribeToRun } from "../../utils/analysisEvents";

export default function SkillDistributionChart({ resumeText }) {
  const { loading, error, data, execute } = useGemini();

  useEffect(
    () => subscribeToRun((text) => text && execute("generateSkillDomains", text)),
    [execute]
  );

  const domains = Array.isArray(data?.domains) ? data.domains : null;

  return (
    <div className="rounded-3xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 sm:p-8 shadow-xs my-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-primary-600">
            <Icon name="chart" className="h-4 w-4 inline-block -mt-0.5 mr-1.5" />Domain Distribution & Skill Percentiles
          </span>
          <h3 className="text-lg font-extrabold text-[var(--theme-text,#0f172a)] mt-0.5">
            Technical Competency Breakdown
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold text-[var(--theme-text-muted,#64748b)]">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-primary-600 shadow-2xs" />
            Your Score
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-md bg-[var(--theme-border,#e2e8f0)]" />
            Target Baseline
          </span>
          <button
            onClick={() => execute("generateSkillDomains", resumeText)}
            disabled={loading || !resumeText}
            className="rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer active:scale-95"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-700 mb-4">
          {error}
        </div>
      )}

      {!domains && !loading && !error && (
        <p className="text-sm font-medium text-[var(--theme-text-muted,#64748b)]">
          Select &quot;Analyze&quot; to see your competency across domain areas based on your resume.
        </p>
      )}

      {domains && (
        <div className="space-y-4">
          {domains.map((item) => (
            <div
              key={item.category}
              className="group rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 p-3.5 hover:border-primary-200 transition-all duration-300"
            >
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="flex items-center gap-2 text-[var(--theme-text,#0f172a)] font-extrabold">
                  <span className="text-base">{item.icon}</span>
                  {item.category}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md border text-[12px] font-extrabold ${
                    item.score >= 85
                      ? "border-primary-200 bg-primary-50 text-primary-600"
                      : item.score >= 70
                      ? "border-accent-200 bg-accent-50 text-primary-600"
                      : "border-shortlist-200 bg-shortlist-50 text-shortlist-700"
                  }`}>
                    {item.score >= 85 ? "Mastery" : item.score >= 70 ? "Proficient" : "Needs Growth"}
                  </span>
                  <span className="text-[var(--theme-text,#0f172a)] font-extrabold text-sm">{Math.round(item.score)}%</span>
                </div>
              </div>

              {/* Visual Dual Progress Track */}
              <div className="relative h-3.5 w-full rounded-full bg-[var(--theme-border,#e2e8f0)] overflow-hidden p-0.5">
                {/* Target Benchmark Indicator Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[var(--theme-text-muted)] z-10"
                  style={{ left: `${Math.min(100, Math.max(0, item.target))}%` }}
                  title={`Industry Target: ${Math.round(item.target)}%`}
                />
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-700 ease-out shadow-2xs group-hover:scale-[1.01]`}
                  style={{ width: `${Math.min(100, Math.max(0, item.score))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
