function Donut({ value = 78, size = 104 }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const end = c - (c * value) / 100;
  const mid = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <defs>
        <linearGradient id="obDonut" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--color-border)" strokeWidth="9" />
      <circle
        cx={mid}
        cy={mid}
        r={r}
        fill="none"
        stroke="url(#obDonut)"
        strokeWidth="9"
        strokeLinecap="round"
        transform={`rotate(-90 ${mid} ${mid})`}
        className="donut-arc"
        style={{ "--dash": c, "--end": end }}
      />
      <text
        x="50%"
        y="50%"
        dy="0.38em"
        textAnchor="middle"
        fill="#fff"
        fontWeight="700"
        fontSize={size / 4.4}
      >
        {value}
      </text>
    </svg>
  );
}

function HBar({ label, pct, tone = "bg-primary", delay = 0 }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[12px]">
        <span className="text-secondary">{label}</span>
        <span className="text-white">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className={`bar-grow h-full rounded-full ${tone}`}
          style={{ width: `${pct}%`, animationDelay: `${delay}ms` }}
        />
      </div>
    </div>
  );
}

function MiniBar({ pct, tone = "bg-primary", delay = 0 }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-border">
      <div
        className={`bar-grow h-full rounded-full ${tone}`}
        style={{ width: `${pct}%`, animationDelay: `${delay}ms` }}
      />
    </div>
  );
}

function Icon({ name, className = "h-4 w-4" }) {
  const paths = {
    star: (
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
    ),
  };
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      {paths[name]}
    </svg>
  );
}

export function Chip({ children, tone = "primary" }) {
  const tones = {
    primary: "border-primary/30 bg-primary/10 text-primary",
    violet: "border-accent/30 bg-accent/10 text-accent",
    green: "border-primary-500/30 bg-primary-500/10 text-primary-600",
    amber: "border-shortlist-400/30 bg-shortlist-400/10 text-shortlist-700",
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${
        tones[tone] || tones.primary
      }`}
    >
      {children}
    </span>
  );
}

function Bubble({ side = "left", children }) {
  return (
    <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
          side === "right"
            ? "rounded-br-sm bg-primary/20 text-white"
            : "rounded-bl-sm border border-border bg-card text-secondary"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function FileCard({ name, type = "PDF", tone = "primary" }) {
  const tones = {
    primary: "text-primary bg-primary/10",
    violet: "text-accent bg-accent/10",
    green: "text-primary-600 bg-primary-500/10",
  };
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-bold ${
          tones[tone] || tones.primary
        }`}
      >
        {type}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium text-white">{name}</div>
        <div className="mt-1 h-1 w-2/3 overflow-hidden rounded-full bg-border">
          <div className="bar-grow h-full w-3/4 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

/* ---------- slide illustrations ---------- */

export function UploadIllustration() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="text-primary"
        >
          <path d="M12 16V4m0 0 4 4m-4-4-4 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className="w-44 space-y-2">
        <FileCard name="resume.pdf" type="PDF" />
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-[11px] text-secondary">
          Parsed locally · nothing leaves your device
        </div>
      </div>
    </div>
  );
}

export function ScoreIllustration() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <Donut value={78} />
      <div className="w-40 space-y-2.5">
        <HBar label="Skills" pct={82} />
        <HBar label="Experience" pct={74} tone="bg-accent" delay={120} />
        <HBar label="Projects" pct={68} tone="bg-primary-500" delay={240} />
        <HBar label="Education" pct={79} tone="bg-shortlist-400" delay={360} />
      </div>
    </div>
  );
}

export function SkillGapIllustration() {
  return (
    <div className="mx-auto w-full max-w-xs space-y-2.5">
      <HBar label="Python" pct={88} />
      <HBar label="React" pct={80} tone="bg-accent" delay={100} />
      <HBar label="System Design" pct={35} tone="bg-shortlist-400" delay={200} />
      <div className="stagger-item rounded-lg border border-shortlist-400/30 bg-shortlist-400/10 px-3 py-2 text-[12px] text-shortlist-700" style={{ animationDelay: "320ms" }}>
        Biggest gap: System Design — here are the resources to start.
      </div>
    </div>
  );
}

export function RoadmapIllustration() {
  const steps = [
    { label: "Start", done: true },
    { label: "30 days", done: true },
    { label: "60 days", active: true },
    { label: "90 days" },
  ];
  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="flex items-center">
        {steps.map((step, i) => (
          <div key={step.label} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : "flex-none"}`}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold ${
                  step.done
                    ? "border-primary bg-primary text-white"
                    : step.active
                      ? "border-accent bg-accent/20 text-accent"
                      : "border-border text-secondary"
                }`}
              >
                {step.done ? "✓" : i + 1}
              </span>
              <span className={`whitespace-nowrap text-[10px] ${step.done || step.active ? "text-white" : "text-secondary"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-1 mb-4 h-0.5 flex-1 rounded-full ${step.done ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InterviewIllustration() {
  return (
    <div className="mx-auto w-full max-w-xs space-y-2">
      <Bubble side="left">Q: Tell me about a complex system you designed.</Bubble>
      <Bubble side="right">Tip: lead with impact — traffic, latency, and how you measured it.</Bubble>
      <div className="flex flex-wrap justify-center gap-1.5 pt-1">
        <Chip tone="violet">DSA · Arrays</Chip>
        <Chip tone="green">System Design</Chip>
        <Chip tone="amber">Behavioral</Chip>
      </div>
    </div>
  );
}

export function SessionIllustration() {
  return (
    <div className="mx-auto w-full max-w-xs space-y-2.5">
      <div className="rounded-lg border border-border bg-card px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-white">Backend Engineer</span>
          <Chip>Job Rules</Chip>
        </div>
        <div className="mt-1.5 text-[11px] leading-relaxed text-secondary">
          Requirements, keywords, and weights for this role.
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip tone="violet">Python</Chip>
        <Chip tone="green">PostgreSQL</Chip>
        <Chip tone="amber">System Design</Chip>
        <Chip>Docker</Chip>
      </div>
    </div>
  );
}

export function RankingIllustration() {
  const rows = [
    { rank: 1, name: "A. Sharma", score: 92, top: true },
    { rank: 2, name: "J. Chen", score: 84, top: true },
    { rank: 3, name: "M. Patel", score: 71, top: false },
    { rank: 4, name: "R. Singh", score: 64, top: false },
  ];
  return (
    <div className="mx-auto w-full max-w-xs space-y-1.5">
      {rows.map((row, i) => (
        <div
          key={row.name}
          className="stagger-item flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <span className="w-5 text-center text-xs font-bold text-secondary">{row.rank}</span>
          <span className="flex-1 truncate text-xs text-white">{row.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              row.top
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-shortlist-400/30 bg-shortlist-400/10 text-shortlist-700"
            }`}
          >
            {row.score}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function CompareIllustration() {
  const cols = [
    { name: "A. Sharma", best: true, bars: [92, 88, 79] },
    { name: "J. Chen", best: false, bars: [84, 91, 74] },
  ];
  const labels = ["Skills", "Experience", "Keywords"];
  return (
    <div className="mx-auto grid w-full max-w-xs grid-cols-2 gap-2.5">
      {cols.map((col, i) => (
        <div
          key={col.name}
          className={`stagger-item rounded-lg border p-3 ${
            col.best ? "border-primary/40 bg-primary/10" : "border-border bg-card"
          }`}
          style={{ animationDelay: `${i * 130}ms` }}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[11px] font-semibold text-white">{col.name}</span>
            <span className="text-shortlist-700"><Icon name="star" className="h-2.5 w-2.5" /></span>
          </div>
          <div className="mt-2 space-y-1.5">
            {labels.map((label, j) => (
              <div key={label}>
                <div className="mb-0.5 flex justify-between text-[10px]">
                  <span className="text-secondary">{label}</span>
                  <span className="text-white">{col.bars[j]}</span>
                </div>
                <MiniBar pct={col.bars[j]} tone={col.best ? "bg-primary" : "bg-accent"} delay={150 + i * 130 + j * 100} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileIllustration() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      <div className="w-44 space-y-2 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary text-[11px] font-bold text-white">
            AS
          </span>
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold text-white">A. Sharma</div>
            <div className="text-[10px] text-secondary">Backend Engineer</div>
          </div>
        </div>
        <div className="h-px bg-border" />
        <div className="space-y-1.5">
          <MiniBar pct={92} tone="bg-primary-500" />
          <MiniBar pct={84} delay={120} />
          <MiniBar pct={71} tone="bg-shortlist-400" delay={240} />
        </div>
      </div>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="text-primary"
        >
          <path d="M12 3l7 4v5c0 4.5-3 8.5-7 9-4-.5-7-4.5-7-9V7l7-4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export function ChatIllustration() {
  return (
    <div className="mx-auto w-full max-w-xs space-y-2">
      <Bubble side="left">Which candidate has the strongest Docker experience?</Bubble>
      <Bubble side="right">
        J. Chen — resume: "Designed multi-stage builds, cutting image size 60%."
      </Bubble>
      <div className="stagger-item flex justify-end pt-0.5" style={{ animationDelay: "180ms" }}>
        <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-green-400">
          Verbatim · sourced
        </span>
      </div>
    </div>
  );
}
