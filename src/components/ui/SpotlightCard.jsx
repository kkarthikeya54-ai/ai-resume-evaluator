import { useEffect, useRef, useState } from "react";

export default function SpotlightCard({ children, className = "", style, as: Tag = "div" }) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);

  // Spotlight is a pointer flourish: inert on touch / reduced motion.
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const still = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setActive(fine && still);
  }, []);

  const handleMove = (e) => {
    const el = ref.current;
    if (!el || !active) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--spot-x", "50%");
    el.style.setProperty("--spot-y", "50%");
  };

  return (
    <Tag
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`spotlight-card ${className}`}
      style={style}
    >
      {children}
    </Tag>
  );
}
