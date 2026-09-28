import { useEffect } from "react";
import { useGemini } from "../hooks/useGemini";
import { subscribeToRun } from "../utils/analysisEvents";

export default function ResumeAnalyzer({ resumeText }) {
  const { loading, error, data, execute } = useGemini();

  useEffect(
    () => subscribeToRun((text) => text && execute("generateSummary", text)),
    [execute]
  );

  return (
    <section id="summary">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Resume Summary</h2>
        <button
          onClick={() => execute("generateSummary", resumeText)}
          disabled={loading || !resumeText}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Generating..." : "Generate Summary"}
        </button>
      </div>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}
      {data?.summary && (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-secondary leading-relaxed">{data.summary}</p>
        </div>
      )}
    </section>
  );
}
