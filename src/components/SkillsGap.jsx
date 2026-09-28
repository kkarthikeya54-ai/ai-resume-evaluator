import { useEffect } from "react";
import { useGemini } from "../hooks/useGemini";
import { subscribeToRun } from "../utils/analysisEvents";
import { SkeletonStack } from "./Skeleton";

export default function SkillsGap({ resumeText }) {
  const gap = useGemini();
  const missing = useGemini();

  useEffect(() => {
    return subscribeToRun((text) => {
      if (!text) return;
      gap.execute("generateSkillGap", text);
      missing.execute("generateMissingSkills", text);
    });
  }, [gap.execute, missing.execute]);

  return (
    <section id="skill-gap" className="rounded-3xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 sm:p-8 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-[var(--theme-text,#0f172a)]">Skill Gap Analysis</h2>
        <button
          onClick={() => gap.execute("generateSkillGap", resumeText)}
          disabled={gap.loading || !resumeText}
          className="rounded-xl bg-primary-600 px-5 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer active:scale-95"
        >
          {gap.loading ? "Analyzing..." : "Analyze Skill Gap"}
        </button>
      </div>
      {gap.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-700 mb-4">
          {gap.error}
        </div>
      )}
      {gap.loading && !gap.data && <SkeletonStack count={3} />}
      {gap.data && (
        <div className="space-y-6">
          {(() => {
            const groups = [
              { label: "Current Skills", items: gap.data.currentSkills, color: "bg-primary-600" },
              { label: "In-Demand Skills", items: gap.data.inDemandSkills, color: "bg-accent-600" },
              { label: "Gaps to Fill", items: gap.data.gaps, color: "bg-shortlist-500" },
            ];
            const maxCount = Math.max(
              1,
              ...groups.map((g) => g.items?.length || 0)
            );
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {groups.map((group) => (
                  <div key={group.label} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)]/5 p-3.5">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs font-bold text-[var(--theme-text-muted,#64748b)]">{group.label}</span>
                      <span className="text-lg font-extrabold text-[var(--theme-text,#0f172a)]">{group.items?.length || 0}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--theme-border,#e2e8f0)]">
                      <div
                        className={`h-full rounded-full ${group.color}`}
                        style={{ width: `${((group.items?.length || 0) / maxCount) * 100}%` }}
                      />
                    </div>
                    {group.items?.length ? (
                      <ul className="mt-3 space-y-1">
                        {group.items.slice(0, 4).map((item, i) => (
                          <li key={i} className="text-xs text-[var(--theme-text-muted,#64748b)] font-medium truncate">{item}</li>
                        ))}
                        {group.items.length > 4 && (
                          <li className="text-xs font-bold text-primary-600">+{group.items.length - 4} more</li>
                        )}
                      </ul>
                    ) : (
                      <p className="mt-3 text-xs text-[var(--theme-text-muted,#64748b)] font-medium">No data</p>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
          {gap.data.analysis && (
            <p className="text-sm text-[var(--theme-text-muted,#64748b)] font-medium leading-relaxed">{gap.data.analysis}</p>
          )}
        </div>
      )}

      <div className="mt-8 pt-8 border-t border-[var(--theme-border,#e2e8f0)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-extrabold text-[var(--theme-text,#0f172a)]">Missing Skills</h3>
          <button
            onClick={() => missing.execute("generateMissingSkills", resumeText)}
            disabled={missing.loading || !resumeText}
            className="rounded-xl bg-primary-600 px-5 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer active:scale-95"
          >
            {missing.loading ? "Loading..." : "Get Missing Skills"}
          </button>
        </div>
        {missing.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-700 mb-4">
            {missing.error}
          </div>
        )}
        {missing.loading && !missing.data && <SkeletonStack count={3} />}
        {missing.data?.missingSkills && (
          <div className="space-y-3">
            {missing.data.missingSkills.map((item, i) => (
              <div key={i} className="rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[var(--theme-text,#0f172a)]">{item.skill}</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${
                    item.importance === "high" ? "bg-red-500/10 text-red-700 border border-red-500/30" :
                    item.importance === "medium" ? "bg-shortlist-50 text-shortlist-700 border border-shortlist-200" :
                    "bg-primary-50 text-primary-600 border border-primary-200"
                  }`}>
                    {item.importance} priority
                  </span>
                </div>
                <p className="text-xs text-[var(--theme-text-muted,#64748b)] font-medium mb-2">{item.reason}</p>
                {item.resource && (
                  <a href={item.resource} target="_blank" rel="noreferrer"
                     className="text-xs font-bold text-primary-600 hover:text-primary-600 underline inline-flex items-center gap-1">
                    Learn more &rarr;
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
