import { useEffect, useState } from "react";

/**
 * ConfettiBurst — a tiny one-shot micro-burst for celebratory actions
 * (shortlisting a candidate). 10 particles, ~700ms, then auto-cleanup.
 * Skipped entirely under prefers-reduced-motion or when disabled.
 */
export default function ConfettiBurst({ trigger, onDone }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!trigger) return undefined;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (onDone) onDone();
      return undefined;
    }

    const COLORS = ["#1D6FF2", "#4B87F5", "#5B8DEF", "#DBEAFE", "#1257C4"];
    const next = Array.from({ length: 10 }, (_, i) => ({
      id: `${trigger}-${i}`,
      color: COLORS[i % COLORS.length],
      dx: (Math.random() - 0.5) * 90,
      dy: -20 - Math.random() * 55,
      rot: (Math.random() - 0.5) * 260,
      delay: i * 18,
    }));
    setParticles(next);

    const cleanupTimer = setTimeout(() => {
      setParticles([]);
      if (onDone) onDone();
    }, 900);

    return () => clearTimeout(cleanupTimer);
  }, [trigger, onDone]);

  if (!particles.length) return null;

  return (
    <span className="pointer-events-none absolute left-1/2 top-0 z-20" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="confetti-dot"
          style={{
            background: p.color,
            "--dx": `${p.dx}px`,
            "--dy": `${p.dy}px`,
            "--rot": `${p.rot}deg`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
    </span>
  );
}
