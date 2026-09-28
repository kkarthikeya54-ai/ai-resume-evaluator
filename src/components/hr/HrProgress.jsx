import { useRef } from "react";
import { SkeletonRows } from "../Skeleton";

function formatEta(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = ms / 60000;
  if (minutes >= 1.5) return `~${Math.round(minutes)} min remaining`;
  return "<1 min remaining";
}

/**
 * Two-phase pipeline progress:
 *   1. "extracting" — reading/parsing/OCR of every uploaded file. The bar
 *      tracks extracted-file count; cached files fly through instantly.
 *   2. "scoring" (legacy alias: "processing") — AI evaluation batches; the
 *      bar tracks completed candidates and the ETA projects the finish.
 */
export default function HrProgress({ progress }) {
  if (!progress) return null;

  const isExtracting = progress.stage === "extracting";
  const isScoring = progress.stage === "scoring" || progress.stage === "processing";
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  /* Track run start + completion rate for a live ETA. Phase switches reset
     the clock naturally: `done` restarts from a low value, which the
     monotonic guard treats as a fresh run. */
  const rateRef = useRef({ startedAt: 0, lastDone: 0 });
  if (progress.done < rateRef.current.lastDone || rateRef.current.lastDone === 0) {
    rateRef.current = { startedAt: Date.now(), lastDone: progress.done };
  } else {
    rateRef.current.lastDone = progress.done;
  }
  const elapsedMs = Date.now() - rateRef.current.startedAt;
  const eta =
    progress.done >= 2 && pct < 100 && elapsedMs > 3000
      ? formatEta((elapsedMs / progress.done) * (progress.total - progress.done))
      : null;
  const perMinute =
    progress.done >= 2 && elapsedMs > 3000
      ? Math.round((progress.done / elapsedMs) * 60000)
      : null;

  const heading = isExtracting
    ? "Reading resumes..."
    : isScoring
      ? "Evaluating resumes..."
      : "Working...";
  const phaseNote = isExtracting
    ? "Extracting text from files (cached files are instant)"
    : isScoring
      ? progress.local
        ? "Fast local scoring — no AI wait, instant results"
        : progress.aiEnabled
          ? "AI is scoring every resume against the job rules"
          : "Local heuristic scoring (AI off)"
      : "";

  return (
    <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[var(--theme-text)]">
          {heading}
          {isScoring && (
            <span
              className={`ml-3 inline-flex items-center rounded-full border px-2.5 py-0.5 align-middle text-[11px] font-extrabold uppercase tracking-wide ${
                progress.local
                  ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                  : progress.aiEnabled
                    ? "border-primary-200 bg-primary-50 text-primary-600"
                    : "border-[var(--theme-border)] bg-[var(--theme-card)] text-[var(--theme-text-muted)]"
              }`}
            >
              {progress.local ? "Fast local" : progress.aiEnabled ? "AI scoring" : "Local scoring (AI off)"}
            </span>
          )}
          {isExtracting && (
            <span className="ml-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 px-2.5 py-0.5 align-middle text-[11px] font-extrabold uppercase tracking-wide">
              Reading files
            </span>
          )}
        </h3>
        <span className="text-sm font-extrabold text-primary-600">{pct}%</span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#0B1F3A]/[0.06]">
        <div
          className={`hr-stage-meter hr-stage-meter__bar h-full rounded-full transition-all duration-300 ${
            pct >= 100 ? "hr-stage-meter__bar--done" : ""
          } ${isExtracting ? "hr-stage-meter__bar--extracting" : ""}`}
          style={{ width: `${Math.max(pct, isExtracting ? 2 : 0)}%` }}
        />
      </div>

      <p className="text-sm text-[var(--theme-text-muted)] font-medium">
        {progress.done}/{progress.total} {isExtracting ? "files read" : "processed"}
        {perMinute ? ` · ${perMinute}/min` : ""}
        {eta ? <span className="ml-1 font-bold text-[var(--theme-text)]">· {eta}</span> : null}
        {phaseNote ? ` · ${phaseNote}` : ""}
        {progress.currentFile ? ` — ${isExtracting ? "reading" : "scoring"} ${progress.currentFile}` : ""}
      </p>
      {progress.failedCount > 0 && (
        <p className="text-xs font-bold text-red-600">{progress.failedCount} file(s) could not be read.</p>
      )}
      {isScoring && <SkeletonRows rows={4} cols={5} className="mt-4" />}
    </section>
  );
}
