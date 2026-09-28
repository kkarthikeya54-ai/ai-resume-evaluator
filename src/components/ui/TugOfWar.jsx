import { useEffect, useState } from "react";

/**
 * TugOfWar — a duel bar for compare views. Starts at 50/50, then the split
 * slides toward the stronger side (winner tinted sage, loser coral-muted).
 * Purely presentational; skipped animation under prefers-reduced-motion
 * (the CSS transition simply applies instantly there).
 *
 * Props:
 *  - left / right: { label, value } — value is a 0-100 number
 */
export default function TugOfWar({ left, right, delay = 200 }) {
  const a = Number(left?.value) || 0;
  const b = Number(right?.value) || 0;
  const total = a + b;

  const [split, setSplit] = useState(50);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (total <= 0) {
        setSplit(50);
        return;
      }
      // Map the value ratio to a 12–88% split so the leader is always visible
      const ratio = a / total;
      setSplit(Math.round(12 + ratio * 76));
    }, delay);
    return () => clearTimeout(timer);
  }, [a, b, total, delay]);

  const aWins = a > b;
  const tie = a === b;

  return (
    <div className="w-full" role="img" aria-label={`${left?.label || "Left"} ${a}% versus ${right?.label || "Right"} ${b}%`}>
      <div className="flex items-center justify-between text-[12px] font-black mb-1">
        <span className={aWins ? "text-primary-600" : tie ? "text-[var(--theme-text-muted)]" : "text-[var(--theme-text-muted)]"}>
          {left?.label} · {a}%
        </span>
        <span className={b > a ? "text-primary-600" : "text-[var(--theme-text-muted)]"}>
          {b}% · {right?.label}
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg,#0f172a)]/40">
        <div
          className={`h-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            aWins ? "bg-primary-500" : "bg-shortlist-400/60"
          }`}
          style={{ width: `${split}%` }}
        />
        <div
          className={`h-full flex-1 transition-colors duration-700 ${
            b > a ? "bg-primary-500" : "bg-shortlist-400/60"
          }`}
        />
      </div>
    </div>
  );
}
