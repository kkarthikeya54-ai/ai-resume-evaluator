import { useEffect, useRef, useState } from "react";

export default function TiltCard3D({
  children,
  className = "",
  maxTilt = 10,
  glare = true,
  scale = 1.015,
  onClick,
}) {
  const cardRef = useRef(null);
  const [active, setActive] = useState(false);
  const [style, setStyle] = useState({
    transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
    transition: "transform 400ms cubic-bezier(0.03, 0.98, 0.52, 0.99)",
  });
  const [glareStyle, setGlareStyle] = useState({
    opacity: 0,
    background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 80%)",
  });

  // Tilt is a pointer effect: skip it on touch devices and when the
  // user prefers reduced motion (no transform churn without intent).
  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const still = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setActive(fine && still);
  }, []);

  const handleMouseMove = (e) => {
    if (!active || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`,
      transition: "transform 80ms ease-out",
    });

    if (glare) {
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      setGlareStyle({
        opacity: 0.5,
        background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 75%)`,
      });
    }
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 500ms cubic-bezier(0.03, 0.98, 0.52, 0.99)",
    });
    setGlareStyle((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        ...style,
        transformStyle: "preserve-3d",
      }}
      className={`relative overflow-hidden ${className}`}
    >
      {glare && (
        <div
          className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
          style={glareStyle}
        />
      )}
      <div className="relative z-10 w-full h-full" style={{ transform: "translateZ(12px)" }}>
        {children}
      </div>
    </div>
  );
}
