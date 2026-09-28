export default function DonutChart({ value, size = 150, stroke = 13, color = "#059669" }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const dash = (circumference * pct) / 100;
  const gradientId = `donut-grad-${Math.random().toString(36).substring(2, 7)}`;

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${size} ${size}`} 
      role="img" 
      aria-label={`${pct}% score`}
      className="transform transition-transform duration-500 hover:scale-105"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#0e7490" />
        </linearGradient>
        <filter id="donut-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#059669" floodOpacity="0.25" />
        </filter>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color === "#059669" ? `url(#${gradientId})` : color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: "stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          filter: "url(#donut-shadow)",
        }}
      />
    </svg>
  );
}
