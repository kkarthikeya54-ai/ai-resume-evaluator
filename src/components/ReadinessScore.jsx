import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useGemini } from "../hooks/useGemini";
import { subscribeToRun } from "../utils/analysisEvents";
import { recordEvaluation } from "../services/userProfile";
import RadarChart from "./charts/RadarChart";
import DonutChart from "./charts/DonutChart";
import SpotlightCard from "./ui/SpotlightCard";
import CountUp from "./ui/CountUp";
import { SkeletonDonut, SkeletonRibbon } from "./Skeleton";

function scoreColor(value) {
  if (value >= 75) return "text-primary-600";
  if (value >= 50) return "text-shortlist-600";
  return "text-red-600";
}

function barColor(value) {
  if (value >= 75) return "bg-primary-600";
  if (value >= 50) return "bg-shortlist-500";
  return "bg-red-500";
}

export default function ReadinessScore({ resumeText }) {
  const { user } = useAuth();
  const { loading, error, data, execute } = useGemini();

  useEffect(
    () => subscribeToRun((text) => text && execute("generateReadiness", text)),
    [execute]
  );

  // Persist score to user profile in Firestore after each evaluation
  useEffect(() => {
    if (data?.score && user?.uid) {
      recordEvaluation(user.uid, data.score, data.breakdown).catch(() => {});
    }
  }, [data?.score, data?.breakdown, user?.uid]);

  const breakdown = data?.breakdown || {};
  const dimensions = Object.entries(breakdown).map(([key, val]) => {
    const entry = val && typeof val === "object" ? val : { score: val, max: 25, note: "" };
    const max = Number(entry.max) || 25;
    return {
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      score: Number(entry.score) || 0,
      max,
      pct: Math.round(((Number(entry.score) || 0) / max) * 100),
      note: entry.note || "",
    };
  });

  return (
    <section id="readiness" className="rounded-3xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 sm:p-8 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold text-[var(--theme-text,#0f172a)]">Placement Readiness Score</h2>
        <button
          onClick={() => execute("generateReadiness", resumeText)}
          disabled={loading || !resumeText}
          className="rounded-xl bg-primary-600 px-5 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer active:scale-95"
        >
          {loading ? "Calculating..." : "Calculate Score"}
        </button>
      </div>
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-700 mb-4">
          {error}
        </div>
      )}
      {loading && !data && (
        <div className="flex flex-col sm:flex-row items-center gap-8" aria-hidden="true">
          <SkeletonDonut size={150} className="shrink-0" />
          <div className="flex-1 w-full space-y-4">
            {[90, 74, 58, 42].map((w, i) => (
              <SkeletonRibbon key={i} width={`${w}%`} />
            ))}
          </div>
        </div>
      )}
      {data && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative shrink-0">
              <DonutChart
                value={data.score}
                size={150}
                color={
                  data.score >= 75 ? "#059669" : data.score >= 50 ? "#f59e0b" : "#ef4444"
                }
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-[var(--theme-text,#0f172a)]">
                  <CountUp value={data.score} duration={1300} />
                </span>
                <span className="text-xs font-semibold text-[var(--theme-text-muted,#64748b)]">/100</span>
              </div>
            </div>
            <div className="flex-1 w-full">
              <p className="text-sm font-medium text-[var(--theme-text-muted,#64748b)] mb-4">
                Overall placement readiness score across skills, experience, education, and
                projects.
              </p>
              <div className="w-full space-y-3">
                {dimensions.map((dim, i) => (
                  <div key={dim.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold text-[var(--theme-text,#0f172a)]">{dim.label}</span>
                      <span className={`font-bold ${scoreColor(dim.pct)}`}>{dim.pct}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--theme-border,#e2e8f0)]">
                      <div
                        className={`bar-grow h-full rounded-full ${barColor(dim.pct)}`}
                        style={{ width: `${dim.pct}%`, animationDelay: `${i * 120}ms` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {dimensions.length >= 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-6 border-t border-[var(--theme-border,#e2e8f0)] pt-6">
              <RadarChart
                labels={dimensions.map((d) => d.label)}
                values={dimensions.map((d) => d.pct)}
                size={300}
              />
              <div className="space-y-4">
                {dimensions.map((dim, dimIdx) => (
                  <SpotlightCard
                    key={dim.key}
                    className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 p-3.5 stagger-item transition-shadow duration-300 hover:shadow-md"
                    style={{ animationDelay: `${dimIdx * 70}ms` }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--theme-text,#0f172a)] uppercase tracking-wide">
                        {dim.label}
                      </span>
                      <span className={`text-sm font-bold ${scoreColor(dim.pct)}`}>
                        {dim.score}/{dim.max}
                      </span>
                    </div>
                    {dim.note && <p className="text-xs font-medium text-[var(--theme-text-muted,#64748b)]">{dim.note}</p>}
                  </SpotlightCard>
                ))}
              </div>
            </div>
          )}

          {(data.strengths?.length || data.weaknesses?.length) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-[var(--theme-border,#e2e8f0)] pt-6">
              <div>
                <h4 className="text-sm font-bold text-[var(--theme-text,#0f172a)] mb-2">Strengths</h4>
                <ul className="space-y-1.5">
                  {data.strengths?.map((s, i) => (
                    <li key={i} className="text-sm text-[var(--theme-text-muted,#64748b)] font-medium flex items-start gap-2">
                      <span className="text-primary-600 font-bold mt-0.5">&#10003;</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--theme-text,#0f172a)] mb-2">Areas to Improve</h4>
                <ul className="space-y-1.5">
                  {data.weaknesses?.map((w, i) => (
                    <li key={i} className="text-sm text-[var(--theme-text-muted,#64748b)] font-medium flex items-start gap-2">
                      <span className="text-amber-600 font-bold mt-0.5">&#33;</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
