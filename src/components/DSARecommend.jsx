import { useEffect } from "react";
import { useGemini } from "../hooks/useGemini";
import { subscribeToRun } from "../utils/analysisEvents";
import { SkeletonStack } from "./Skeleton";

export default function DSARecommend({ resumeText }) {
  const { loading, error, data, execute } = useGemini();

  useEffect(
    () => subscribeToRun((text) => text && execute("generateDSA", text)),
    [execute]
  );

  return (
    <section id="dsa">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">DSA Recommendations</h2>
        <button
          onClick={() => execute("generateDSA", resumeText)}
          disabled={loading || !resumeText}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Generating..." : "Get DSA Plan"}
        </button>
      </div>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}
      {loading && !data && <SkeletonStack count={3} />}
      {data?.recommendations && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Key Topics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.recommendations.topics?.map((t, i) => (
                <div key={i} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{t.topic}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      t.importance === "high" ? "bg-red-500/20 text-red-400" :
                      t.importance === "medium" ? "bg-shortlist-500/20 text-shortlist-400" :
                      "bg-green-500/20 text-green-400"
                    }`}>{t.importance}</span>
                  </div>
                  <p className="text-xs text-secondary">{t.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Practice Plan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.recommendations.practicePlan?.map((w, i) => (
                <div key={i} className="rounded-lg border border-border p-3">
                  <h4 className="text-sm font-semibold text-primary mb-2">{w.week}</h4>
                  <p className="text-xs text-secondary mb-1">{w.topics?.join(", ")}</p>
                  <p className="text-xs text-secondary">Problems: {w.problemsToSolve}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Resources</h3>
            <ul className="space-y-2">
              {data.recommendations.resources?.map((r, i) => (
                <li key={i}>
                  <a href={r.url} target="_blank" rel="noreferrer"
                     className="text-sm text-primary hover:text-primary-hover underline">
                    {r.name}
                  </a>
                  <span className="text-xs text-secondary ml-2">({r.type})</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
