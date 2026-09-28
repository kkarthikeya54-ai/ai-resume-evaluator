import { useEffect } from "react";
import { useGemini } from "../hooks/useGemini";
import { subscribeToRun } from "../utils/analysisEvents";
import { SkeletonStack } from "./Skeleton";

export default function ResumeImprovements({ resumeText }) {
  const { loading, error, data, execute } = useGemini();

  useEffect(
    () => subscribeToRun((text) => text && execute("generateImprovements", text)),
    [execute]
  );

  return (
    <section id="improvements">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Resume Improvements</h2>
        <button
          onClick={() => execute("generateImprovements", resumeText)}
          disabled={loading || !resumeText}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Analyzing..." : "Get Improvements"}
        </button>
      </div>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}
      {loading && !data && <SkeletonStack count={3} />}
      {data?.improvements && (
        <div className="space-y-3">
          {data.improvements.map((item, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-white">{item.section}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  item.priority === "high" ? "bg-red-500/20 text-red-400" :
                  item.priority === "medium" ? "bg-shortlist-500/20 text-shortlist-400" :
                  "bg-green-500/20 text-green-400"
                }`}>
                  {item.priority}
                </span>
              </div>
              <p className="text-xs text-secondary mb-1"><em>Issue:</em> {item.issue}</p>
              <p className="text-xs text-secondary"><em>Suggestion:</em> {item.suggestion}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
