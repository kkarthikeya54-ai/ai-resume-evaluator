import { useEffect, useRef, useState } from "react";

/**
 * Magnetic hover — the wrapped element is gently pulled toward the
 * cursor within its bounds. Desktop fine-pointers only, and fully
 * disabled under prefers-reduced-motion.
 */
export default function Magnetic({ children, strength = 0.35, className = "" }) {
  const ref = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const still = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(fine && still);
  }, []);

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: (e.clientX - (rect.left + rect.width / 2)) * strength,
      y: (e.clientY - (rect.top + rect.height / 2)) * strength,
    });
  };

  const handleLeave = () => setPos({ x: 0, y: 0 });

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={enabled ? handleMove : undefined}
      onMouseLeave={enabled ? handleLeave : undefined}
      style={{
        display: "inline-block",
        transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        willChange: enabled ? "transform" : "auto",
      }}
    >
      {children}
    </div>
  );
}
