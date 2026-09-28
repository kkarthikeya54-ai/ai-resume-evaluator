export default function Marquee({ items = [], speed = 25, className = "" }) {
  const doubleItems = [...items, ...items];

  return (
    <div className={`relative overflow-hidden w-full ${className}`}>
      {/* Gradient Mask Edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[var(--theme-bg,#f9fafb)] to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[var(--theme-bg,#f9fafb)] to-transparent z-10" />

      <div 
        className="marquee-track flex gap-4 items-center py-2"
        style={{ animationDuration: `${speed}s` }}
      >
        {doubleItems.map((item, index) => (
          <div
            key={index}
            className="shrink-0 rounded-full border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-4 py-2 text-xs font-bold text-[var(--theme-text,#0f172a)] shadow-2xs hover:border-primary-300 hover:text-primary-600 transition-all cursor-default"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
