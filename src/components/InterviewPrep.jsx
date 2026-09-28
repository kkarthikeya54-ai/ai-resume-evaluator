import { useEffect } from "react";
import { useGemini } from "../hooks/useGemini";
import { subscribeToRun } from "../utils/analysisEvents";
import { SkeletonStack } from "./Skeleton";

export default function InterviewPrep({ resumeText }) {
  const { loading, error, data, execute } = useGemini();

  useEffect(
    () => subscribeToRun((text) => text && execute("generateInterviewQuestions", text)),
    [execute]
  );

  return (
    <section id="interview">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Interview Questions</h2>
        <button
          onClick={() => execute("generateInterviewQuestions", resumeText)}
          disabled={loading || !resumeText}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Generating..." : "Generate Questions"}
        </button>
      </div>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}
      {loading && !data && <SkeletonStack count={3} />}
      {data?.questions && (
        <div className="space-y-3">
          {data.questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {q.category}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white mb-2">{q.question}</h4>
              <p className="text-xs text-secondary mb-2">
                <span className="text-white">Expected answer:</span> {q.expectedAnswer}
              </p>
              <p className="text-xs text-secondary">
                <span className="text-primary">Tip:</span> {q.preparationTip}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
