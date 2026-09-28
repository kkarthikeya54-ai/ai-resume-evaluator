import { useRef, useState } from "react";

const SKILLS = [
  { name: "React 19", category: "Frontend", level: "96%" },
  { name: "Node.js", category: "Backend", level: "92%" },
  { name: "System Design", category: "Architecture", level: "88%" },
  { name: "Python / AI", category: "Machine Learning", level: "85%" },
  { name: "TypeScript", category: "Language", level: "94%" },
  { name: "Tailwind v4", category: "Styling", level: "98%" },
  { name: "Docker", category: "DevOps", level: "82%" },
  { name: "WebGL / 3D", category: "Graphics", level: "90%" },
  { name: "DSA / Algos", category: "Problem Solving", level: "89%" },
  { name: "REST APIs", category: "Backend", level: "95%" },
  { name: "PostgreSQL", category: "Database", level: "86%" },
  { name: "NVIDIA AI", category: "AI Engine", level: "99%" },
];

export default function SkillCloud3D({ className = "" }) {
  const containerRef = useRef(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Compute 3D Fibonacci Sphere positions
  const items = SKILLS.map((skill, i) => {
    const phi = Math.acos(-1 + (2 * i + 1) / SKILLS.length);
    const theta = Math.sqrt(SKILLS.length * Math.PI) * phi;
    const radius = 140; // 3D Sphere radius

    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(phi);

    return { ...skill, x, y, z };
  });

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = (e.clientX - centerX) / (rect.width / 2);
    const mouseY = (e.clientY - centerY) / (rect.height / 2);

    setRotation({
      x: mouseY * 25,
      y: mouseX * 35,
    });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setHoveredIdx(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative h-[360px] w-full flex items-center justify-center select-none overflow-hidden ${className}`}
      style={{ perspective: "1000px" }}
    >
      {/* Background ambient ring */}
      <div className="absolute h-64 w-64 rounded-full border border-primary-200/50 bg-primary-50/20 blur-xl pointer-events-none" />

      {/* 3D Rotating Sphere Stage */}
      <div
        className="relative h-full w-full flex items-center justify-center transition-transform duration-500 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${-rotation.x}deg) rotateY(${rotation.y}deg)`,
        }}
      >
        {items.map((item, idx) => {
          // Calculate scale and depth opacity based on Z position
          const scale = (item.z + 200) / 280;
          const opacity = Math.max(0.35, Math.min(1, (item.z + 180) / 280));
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={item.name}
              onMouseEnter={() => setHoveredIdx(idx)}
              className={`absolute cursor-pointer transition-all duration-300 rounded-xl border px-3 py-1.5 backdrop-blur-xs flex items-center gap-2 shadow-2xs ${
                isHovered
                  ? "border-primary-400 bg-primary-600 text-white shadow-md shadow-primary-600/30 scale-125 z-50"
                  : "border-[var(--theme-border)] bg-[var(--theme-card)]/90 text-[var(--theme-text)] hover:border-primary-300 hover:bg-primary-50/80"
              }`}
              style={{
                transform: `translate3d(${item.x}px, ${item.y}px, ${item.z}px) scale(${scale})`,
                opacity: opacity,
              }}
            >
              <span className={`h-2 w-2 rounded-full ${isHovered ? "bg-[var(--theme-card)] animate-pulse" : "bg-primary-500"}`} />
              <span className="text-xs font-extrabold font-mono tracking-tight">{item.name}</span>
              {isHovered && (
                <span className="text-[11px] font-black bg-[var(--theme-card)]/10 px-1.5 py-0.5 rounded-md">
                  {item.level}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
