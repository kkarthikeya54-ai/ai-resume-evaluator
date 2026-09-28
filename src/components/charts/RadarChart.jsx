import { useState } from "react";

const CORAL = "var(--color-primary-500)"; // brand primary
const SAGE = "var(--color-accent-500)"; // baseline
const AMBER = "var(--color-shortlist-500)"; // mid-band
const ROSE = "var(--color-red-400)"; // below target

function coord(center, radius, index, count) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}

function getRankTier(score) {
  if (score >= 90)
    return { tier: "S+", title: "Exceptional fit", bg: "bg-shortlist-100 text-shortlist-700 border-shortlist-300" };
  if (score >= 80)
    return { tier: "S", title: "Strong fit", bg: "bg-primary-100 text-primary-900 border-primary-300" };
  if (score >= 70)
    return { tier: "A", title: "Solid fit", bg: "bg-accent-100 text-accent-700 border-accent-300" };
  if (score >= 60)
    return { tier: "B", title: "Developing fit", bg: "bg-shortlist-50 text-shortlist-700 border-shortlist-200" };
  return { tier: "C", title: "Below target", bg: "bg-red-50 text-red-700 border-red-200" };
}

function valueTone(value) {
  if (value >= 75) return CORAL;
  if (value >= 50) return AMBER;
  return ROSE;
}

export default function RadarChart({
  labels,
  values,
  max = 100,
  size = 360,
  showValues = true,
  benchmarkValues = [75, 80, 70, 75, 80],
  showRankBadge = true,
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const count = labels.length;
  const center = size / 2;
  const maxRadius = center - 68;
  const minRadius = maxRadius * 0.12;
  const ringSteps = [0.25, 0.5, 0.75, 1];

  const clamped = values.map((v) => Math.max(0, Math.min(Number(v) || 0, max)));
  const avgScore = clamped.length ? Math.round(clamped.reduce((a, b) => a + b, 0) / clamped.length) : 0;
  const rank = getRankTier(avgScore);
  const gradId = `radar-grad-${Math.random().toString(36).substring(2, 7)}`;

  const getRadius = (val) => minRadius + (val / max) * (maxRadius - minRadius);

  const dataPoints = clamped.map((v, i) => coord(center, getRadius(v), i, count));
  const polygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const benchmarkPoints = benchmarkValues.map((bv, i) => coord(center, getRadius(bv), i, count));
  const benchmarkPolygon = benchmarkPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="relative flex flex-col items-center select-none">
      {showRankBadge && (
        <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)]/95 px-4 py-2 shadow-2xs">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${rank.bg}`}>
            {rank.tier}
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text-muted)]">
              {rank.title}
            </span>
            <span className="text-xs font-black text-[var(--theme-text)]">
              {avgScore}% across {labels.length} axes
            </span>
          </div>
        </div>
      )}

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-md mx-auto overflow-visible"
        role="img"
        aria-label="Candidate skill profile radar chart"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={CORAL} stopOpacity="0.42" />
            <stop offset="100%" stopColor={SAGE} stopOpacity="0.16" />
          </linearGradient>
        </defs>

        {/* Concentric polygonal web grid */}
        {ringSteps.map((step, idx) => {
          const r = minRadius + step * (maxRadius - minRadius);
          return (
            <polygon
              key={step}
              points={labels
                .map((_, i) => {
                  const c = coord(center, r, i, count);
                  return `${c.x},${c.y}`;
                })
                .join(" ")}
              fill={idx % 2 === 0 ? "rgba(11, 31, 58, 0.035)" : "transparent"}
              stroke="var(--theme-border)"
              strokeWidth={1.25}
              strokeDasharray={step === 1 ? "none" : "3 4"}
            />
          );
        })}

        {/* Radial axis spokes */}
        {labels.map((_, i) => {
          const c = coord(center, maxRadius, i, count);
          const isHovered = hoveredIdx === i;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={c.x}
              y2={c.y}
              stroke={isHovered ? CORAL : "var(--theme-border)"}
              strokeWidth={isHovered ? 2 : 1.25}
              strokeDasharray={isHovered ? "none" : "2 3"}
              className="transition-colors duration-200"
            />
          );
        })}

        {/* Target-role baseline overlay */}
        {benchmarkValues && benchmarkValues.length > 0 && (
          <polygon
            points={benchmarkPolygon}
            fill="none"
            stroke={SAGE}
            strokeWidth={1.5}
            strokeDasharray="5 5"
            opacity={0.6}
          />
        )}

        {/* Candidate score polygon */}
        <polygon
          points={polygon}
          fill={`url(#${gradId})`}
          stroke={CORAL}
          strokeWidth={2.25}
          strokeLinejoin="round"
          className="transition-all duration-700 ease-out"
        />

        {/* Vertex markers */}
        {dataPoints.map((p, i) => {
          const score = clamped[i];
          const isHovered = hoveredIdx === i;
          const nodeColor = valueTone(score);

          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 13 : 8}
                fill={nodeColor}
                fillOpacity={isHovered ? 0.3 : 0.16}
                className="transition-all duration-200"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 5.5 : 4}
                fill={nodeColor}
                stroke="var(--theme-card)"
                strokeWidth={2}
                className="transition-all duration-200"
              />
            </g>
          );
        })}

        {/* Axis labels & score markers */}
        {labels.map((label, i) => {
          const labelCoord = coord(center, maxRadius + 26, i, count);
          const val = clamped[i];
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <text
                x={labelCoord.x}
                y={labelCoord.y - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={label.length > 9 ? 10 : 11}
                fontWeight={isHovered ? 900 : 700}
                fill={isHovered ? CORAL : "var(--theme-text)"}
                className="font-sans tracking-wide transition-colors duration-200"
              >
                {label}
              </text>
              {showValues && (
                <text
                  x={labelCoord.x}
                  y={labelCoord.y + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontWeight={800}
                  fill={isHovered ? CORAL : valueTone(val)}
                  className="font-mono"
                >
                  {val}%
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-6 text-[12px] font-bold text-[var(--theme-text-muted)]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary-500 shadow-2xs" />
          <span>Candidate score</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-b-2 border-dashed border-accent-400" />
          <span>Target-role baseline</span>
        </div>
      </div>
    </div>
  );
}