import { useEffect } from "react";
import { useGemini } from "../hooks/useGemini";
import { subscribeToRun } from "../utils/analysisEvents";
import { SkeletonStack } from "./Skeleton";

export default function RecommendedContent({ resumeText }) {
  const projects = useGemini();
  const certs = useGemini();

  useEffect(() => {
    return subscribeToRun((text) => {
      if (!text) return;
      projects.execute("generateProjects", text);
      certs.execute("generateCertifications", text);
    });
  }, [projects.execute, certs.execute]);

  return (
    <section id="recommendations">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Recommended Projects</h2>
        <button
          onClick={() => projects.execute("generateProjects", resumeText)}
          disabled={projects.loading || !resumeText}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {projects.loading ? "Loading..." : "Get Project Ideas"}
        </button>
      </div>
      {projects.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 mb-4">
          {projects.error}
        </div>
      )}
      {projects.loading && !projects.data && <SkeletonStack count={2} />}
      {projects.data?.recommendedProjects && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          {projects.data.recommendedProjects.map((p, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm text-[var(--theme-text)]">{p.title}</h4>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  p.difficulty === "beginner" ? "bg-green-500/20 text-green-700" :
                  p.difficulty === "intermediate" ? "bg-amber-500/20 text-amber-700" :
                  "bg-red-500/20 text-red-700"
                }`}>
                  {p.difficulty}
                </span>
              </div>
              <p className="text-xs text-[var(--theme-text-muted)] mb-2">{p.description}</p>
              <p className="text-xs text-[var(--theme-text-muted)] mb-1">
                <span className="font-semibold text-[var(--theme-text)]">Tech:</span> {p.technologies?.join(", ")}
              </p>
              <p className="text-xs text-[var(--theme-text-muted)]">{p.reason}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Recommended Certifications</h2>
        <button
          onClick={() => certs.execute("generateCertifications", resumeText)}
          disabled={certs.loading || !resumeText}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {certs.loading ? "Loading..." : "Get Certifications"}
        </button>
      </div>
      {certs.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 mb-4">
          {certs.error}
        </div>
      )}
      {certs.loading && !certs.data && <SkeletonStack count={2} />}
      {certs.data?.recommendedCertifications && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {certs.data.recommendedCertifications.map((c, i) => {
            const courseUrl =
              c.url ||
              `https://www.google.com/search?q=${encodeURIComponent(
                `${c.name} ${c.provider} online course certification`
              )}`;
            return (
              <div key={i} className="flex flex-col rounded-xl border border-border bg-card p-4">
                <h4 className="font-semibold text-sm text-[var(--theme-text)] mb-1">{c.name}</h4>
                <p className="text-xs text-primary mb-2">{c.provider}</p>
                <p className="text-xs text-[var(--theme-text-muted)] mb-2">{c.description}</p>
                {c.relevance && (
                  <p className="text-xs text-[var(--theme-text-muted)] mb-3">
                    <span className="font-semibold text-[var(--theme-text)]">Why it helps:</span> {c.relevance}
                  </p>
                )}
                <a
                  href={courseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary-600 hover:bg-primary-600 hover:text-white transition-colors"
                >
                  Start Course &rarr;
                </a>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
