import { useEffect, useRef, useState } from "react";

/**
 * Shared skeleton primitives for AI-generation placeholders.
 * All shapes use .skeleton-base (shimmer sweep) from index.css;
 * card wrappers add a .skeleton-shiver sway so users read the
 * block as "being generated", not "broken".
 */

function useShiver(enabled) {
  useEffect(() => {
    if (!enabled) return;
    const el = document.documentElement;
    el.classList.add("skeleton-ambient");
    return () => el.classList.remove("skeleton-ambient");
  }, [enabled]);
  return enabled;
}

/** Full skeleton card for one AI-result section (icon + two lines). */
export function SkeletonCard({ lines = 2, icon = "✦", className = "" }) {
  const shiver = useShiver(true);
  return (
    <div
      className={`skeleton-card ${shiver ? "skeleton-shiver" : ""} rounded-2xl border border-white/10 bg-white/[0.04] p-5 ${className}`}
      aria-hidden="true"
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0B1F3A]/[0.06] text-sm text-white/40">
          {icon}
        </span>
        <span className="skeleton-base h-4 w-32 rounded-full" />
      </div>
      {Array.from({ length: lines }, (_, i) => (
        <span
          key={i}
          className="skeleton-base mb-2 block h-3 rounded-full"
          style={{ width: `${88 - i * 22}%` }}
        />
      ))}
    </div>
  );
}

/** Stack of skeleton cards, one per AI section, staggered entrance. */
export function SkeletonStack({ count = 3, className = "" }) {
  return (
    <div className={`space-y-4 ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="stagger-item"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <SkeletonCard lines={2} icon={["✦", "◆", "▲", "●", "■"][i % 5]} />
        </div>
      ))}
    </div>
  );
}

/** Row-level skeleton for tables (HR pipeline). */
export function SkeletonRows({ rows = 4, cols = 4, className = "" }) {
  const shiver = useShiver(true);
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="skeleton-shiver grid items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
          style={{
            animationDelay: `${r * 90}ms`,
            gridTemplateColumns: `minmax(0,1fr) repeat(${cols - 1}, 72px)`,
          }}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0B1F3A]/[0.06] text-[11px] text-white/40">
              {r + 1}
            </span>
            <span className="skeleton-base h-3.5 rounded-full" style={{ width: `${62 - r * 6}%` }} />
          </div>
          {Array.from({ length: cols - 1 }, (_, c) => (
            <span key={c} className="skeleton-base h-3 rounded-full" style={{ width: `${70 - c * 12}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Donut-chart placeholder — spinning conic ring + score bar. */
export function SkeletonDonut({ size = 150, className = "" }) {
  return (
    <div
      className={`skeleton-shiver relative grid place-items-center rounded-full ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, rgb(232 93 63 / 0.35), rgb(127 169 155 / 0.35), rgb(232 93 63 / 0.35))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 14px), #000 calc(100% - 13px))",
          WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 14px), #000 calc(100% - 13px))",
          animation: "skeleton-sweep-spin 1.4s linear infinite",
        }}
      />
      <span className="skeleton-base h-8 w-16 rounded-lg" />
    </div>
  );
}

/** Small indeterminate ribbon for inline spots (buttons, chips). */
export function SkeletonRibbon({ width = "100%", className = "" }) {
  return (
    <span
      className={`skeleton-base block rounded-full ${className}`}
      style={{ width, height: 10 }}
      aria-hidden="true"
    />
  );
}
