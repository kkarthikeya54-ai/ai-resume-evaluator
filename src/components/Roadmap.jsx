import { useEffect } from "react";
import { useGemini } from "../hooks/useGemini";
import { subscribeToRun } from "../utils/analysisEvents";
import { SkeletonStack } from "./Skeleton";

export default function Roadmap({ resumeText }) {
  const { loading, error, data, execute } = useGemini();

  useEffect(
    () => subscribeToRun((text) => text && execute("generateRoadmap", text)),
    [execute]
  );

  return (
    <section id="roadmap">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">30/60/90-Day Career Roadmap</h2>
        <button
          onClick={() => execute("generateRoadmap", resumeText)}
          disabled={loading || !resumeText}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Generating..." : "Generate Roadmap"}
        </button>
      </div>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}
      {loading && !data && <SkeletonStack count={3} />}
      {data?.roadmap && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(data.roadmap).map(([phase, weeks]) => (
            <div key={phase}>
              <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider">
                {phase === "30days" ? "Days 1-30" : phase === "60days" ? "Days 31-60" : "Days 61-90"}
              </h3>
              <div className="space-y-3">
                {weeks.map((w, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4">
                    <h4 className="text-sm font-semibold text-white mb-1">{w.week}</h4>
                    <p className="text-xs text-primary mb-2"><strong>Focus:</strong> {w.focus}</p>
                    <ul className="space-y-1 mb-2">
                      {w.actions?.map((a, j) => (
                        <li key={j} className="text-xs text-secondary flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">&#8594;</span> {a}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-secondary">{w.expectedOutcome}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
