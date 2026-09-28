import { useEffect, useState } from "react";
import CountUp from "./CountUp";

function getTier(score) {
  if (score >= 90) return { label: "S+", title: "TOP TIER", color: "#059669", bg: "bg-primary-600", text: "text-primary-600" };
  if (score >= 80) return { label: "S", title: "EXPERT", color: "#0d9488", bg: "bg-teal-700", text: "text-teal-700" };
  if (score >= 70) return { label: "A", title: "ADVANCED", color: "#0284c7", bg: "bg-sky-600", text: "text-sky-700" };
  if (score >= 60) return { label: "B", title: "COMPETENT", color: "#d97706", bg: "bg-shortlist-600", text: "text-shortlist-700" };
  return { label: "C", title: "DEVELOPING", color: "#e11d48", bg: "bg-rose-600", text: "text-rose-700" };
}

export default function ScoreGauge3D({ score = 0, size = 160, strokeWidth = 14, label = "Match Score" }) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const tier = getTier(clamped);
  const [animatedOffset, setAnimatedOffset] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (clamped / 100) * circumference;

  useEffect(() => {
    // Animate the stroke dash offset smoothly
    const timer = setTimeout(() => {
      setAnimatedOffset(targetOffset);
    }, 150);
    return () => clearTimeout(timer);
  }, [targetOffset]);

  const gradId = `gauge-grad-${Math.random().toString(36).substring(2, 8)}`;
  const shadowId = `gauge-shadow-${Math.random().toString(36).substring(2, 8)}`;

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg] overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={tier.color} />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>
            <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={tier.color} floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Background Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            className="opacity-70"
          />

          {/* Animated Glowing Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={animatedOffset}
            strokeLinecap="round"
            filter={`url(#${shadowId})`}
            style={{
              transition: "stroke-dashoffset 1200ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <div className="flex items-baseline">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--theme-text)]">
              <CountUp value={clamped} delay={200} />
            </span>
            <span className="text-base font-bold text-[var(--theme-text-muted)] ml-0.5">%</span>
          </div>
          <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${tier.bg} text-white shadow-2xs`}>
            {tier.label} {tier.title}
          </span>
        </div>
      </div>

      {label && (
        <span className="mt-2 text-xs font-extrabold text-[var(--theme-text-muted)] uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
}
