/**
 * PassRateSlider — the HR pass-rate control.
 *
 * A 0–100 percentage slider: candidates whose overall score falls below
 * the chosen rate are moved to the Rejected stage. Used in two places:
 *  - the "New Session" modal (sets the session's initial pass rate), and
 *  - the results header (live re-thresholding of the current session).
 *
 * `candidateCount` / `belowCount` are optional; when provided they show
 * how many of the current candidates would be rejected at this rate.
 */
import Icon from "../ui/Icon";

export default function PassRateSlider({
  value,
  onChange,
  candidateCount = null,
  belowCount = null,
  hint,
  disabled = false,
}) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const isBlocking = pct > 0;
  const accent = isBlocking ? "text-primary-600" : "text-[var(--theme-text-muted,#64748b)]";

  return (
    <div className="rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/60 px-4 py-3 shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="pass-rate-slider"
          className="flex items-center gap-1.5 text-sm font-bold text-[var(--theme-text,#0f172a)]"
        >
          <Icon name="chart" className="h-3.5 w-3.5" />
          Pass rate
        </label>
        <span
          className={`rounded-lg border px-2.5 py-0.5 font-mono text-sm font-black ${
            isBlocking
              ? "border-primary-200 bg-primary-50 text-primary-700"
              : "border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] text-[var(--theme-text-muted,#64748b)]"
          }`}
          aria-live="polite"
        >
          {pct}%
        </span>
      </div>

      <input
        id="pass-rate-slider"
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="hr-range mt-2.5 w-full cursor-pointer"
        aria-valuetext={`${pct} percent`}
      />

      <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-[var(--theme-text-muted,#64748b)]">
        <span>0%</span>
        <span className={accent}>
          {pct === 0
            ? "Auto-rejection off"
            : `Reject below ${pct}%`}
        </span>
        <span>100%</span>
      </div>

      {candidateCount != null && belowCount != null && candidateCount > 0 && pct > 0 && (
        <p className="mt-1.5 text-xs font-medium text-[var(--theme-text-muted,#475569)]">
          <span className="font-bold text-red-600">{belowCount}</span> of {candidateCount} candidate
          {candidateCount === 1 ? "" : "s"} would be rejected at this rate.
        </p>
      )}

      {hint && (
        <p className="mt-1.5 text-[11px] font-medium text-[var(--theme-text-muted,#64748b)]">{hint}</p>
      )}
    </div>
  );
}
