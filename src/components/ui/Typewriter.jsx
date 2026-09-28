import { useEffect, useState } from "react";

/**
 * Typewriter — reveals text progressively for AI-generated drafts.
 * Respects prefers-reduced-motion (renders instantly).
 * Re-runs whenever `text` changes; `onDone` fires once per run.
 */
export default function Typewriter({ text = "", speed = 12, className = "" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!text) {
      setCount(0);
      return undefined;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(text.length);
      return undefined;
    }

    let raf = null;
    let acc = 0;
    let last = null;
    let cancelled = false;

    const step = (now) => {
      if (cancelled) return;
      if (last === null) last = now;
      acc += now - last;
      last = now;
      if (acc >= speed) {
        const advance = Math.floor(acc / speed);
        acc -= advance * speed;
        setCount((c) => {
          const next = Math.min(c + advance, text.length);
          return next;
        });
      }
      raf = requestAnimationFrame(step);
    };

    // Start from zero on new text
    setCount(0);
    raf = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [text, speed]);

  return (
    <span className={className} aria-label={text}>
      {text.slice(0, count)}
      {count < text.length && <span className="tw-caret" aria-hidden="true" />}
    </span>
 );
}
