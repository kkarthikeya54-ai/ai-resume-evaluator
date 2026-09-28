import CountUp from "../ui/CountUp";
import Icon from "../ui/Icon";

/** SVG progress ring for the champion score — animates from empty to `value`%. */
function ChampionRing({ value, size = 96, children }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const offset = c * (1 - clamped / 100);
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(250, 248, 245, 0.12)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1257C4"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1) 0.2s" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">{children}</span>
    </span>
  );
}

function tierFor(score) {
  if (score >= 90) return { label: "S+", cls: "bg-shortlist-100 text-shortlist-700 border-shortlist-300/50" };
  if (score >= 80) return { label: "S", cls: "bg-primary-100 text-primary-600 border-primary-300/50" };
  if (score >= 70) return { label: "A", cls: "bg-accent-100 text-accent-600 border-accent-300/50" };
  if (score >= 60) return { label: "B", cls: "bg-[#0B1F3A]/[0.06] text-[var(--theme-text-muted)] border-[var(--theme-border)]" };
  return { label: "C", cls: "bg-[#0B1F3A]/[0.04] text-[var(--theme-text-muted)] border-[var(--theme-border)]" };
}

function hrefFor(candidate, sessionId) {
  return sessionId ? `/candidate/${candidate.id}?session=${sessionId}` : `/candidate/${candidate.id}`;
}

function ShortlistTick({ candidate, onToggleShortlist }) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={Boolean(candidate.shortlisted)}
      aria-label={`${candidate.shortlisted ? "Remove" : "Add"} ${
        candidate.evaluation?.name || candidate.fileName
      } ${candidate.shortlisted ? "from" : "to"} shortlist`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleShortlist?.(candidate.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onToggleShortlist?.(candidate.id);
        }
      }}
      className={`mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider transition-all ${
        candidate.shortlisted
          ? "border-shortlist-400/60 bg-shortlist-500/15 text-shortlist-700"
          : "border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:border-shortlist-400/40 hover:text-shortlist-700"
      }`}
    >
      <Icon name="star" className="h-3 w-3" />
      {candidate.shortlisted ? "Shortlisted" : "Shortlist"}
    </span>
  );
}

/**
 * LeaderboardHero — the redesigned top-3 celebration for the results page.
 *
 * Replaces the equal-width "podium" cards with an asymmetric hero:
 *  - Rank #1 owns a large halo-lit card with a conic score ring, gilt
 *    shimmering name, tier badge and a "View report" CTA.
 *  - Ranks #2 / #3 are compact challenger rows with medal chips and
 *    inline score bars.
 */
export default function LeaderboardHero({ candidates = [], sessionId, onToggleShortlist }) {
  if (candidates.length < 3) return null;

  const ranked = [...candidates]
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .slice(0, 3);
  const champion = ranked[0];
  const challengers = [ranked[1], ranked[2]].filter(Boolean);

  const overall = champion.scores?.total ?? champion.scores?.overall ?? 0;
  const tier = tierFor(overall);
  const championSkills = (champion.evaluation?.skills || []).slice(0, 3);

  return (
    <section aria-label="Top three candidates" className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
      {/* ── Champion (rank #1) ─────────────────────────────── */}
      <a
        href={hrefFor(champion, sessionId)}
        className="ht-hero ht-crest ht-engraved spotlight-card stagger-item group relative flex flex-col items-center overflow-hidden rounded-3xl border border-shortlist-300/25 px-6 py-7 text-center shadow-[0_18px_50px_-18px_rgba(212_175_55/0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-18px_rgba(212_175_55/0.45)] lg:col-span-2"
      >
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-shortlist-700/90"
          title="Top ranked candidate"
        >
          <Icon name="crown" className="h-4 w-4 drop-shadow-[0_0_10px_rgba(251,191,36,0.55)]" />
          Champion
        </span>

        {/* Score ring with count-up in the middle */}
        <span className="mt-4">
          <ChampionRing value={overall}>
            <span className="ht-digit text-2xl font-black font-mono text-[var(--theme-text)]">
              <CountUp value={overall} duration={1300} />%
            </span>
          </ChampionRing>
        </span>

        <span className="ht-gilt mt-3 max-w-full truncate text-xl font-black tracking-tight">
          {champion.evaluation?.name || champion.fileName}
        </span>
        <span className="mt-1 max-w-full truncate text-[12px] font-semibold text-[var(--theme-text-muted)]">
          {champion.evaluation?.headline || champion.fileName}
        </span>

        {championSkills.length > 0 && (
          <span className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            {championSkills.map((s) => (
              <span
                key={s}
                className="rounded-full border border-[var(--theme-border)] bg-[#0B1F3A]/[0.04] px-2 py-0.5 text-[11px] font-bold text-[var(--theme-text-muted)]"
              >
                {s}
              </span>
            ))}
          </span>
        )}

        <span className={`mt-3 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${tier.cls}`}>
          Tier {tier.label}
        </span>
        <ShortlistTick candidate={champion} onToggleShortlist={onToggleShortlist} />

        <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary-600/25 transition-transform group-hover:scale-[1.03]">
          View report <span aria-hidden="true">&rarr;</span>
        </span>
      </a>

      {/* ── Challengers (#2 and #3) ────────────────────────── */}
      <div className="flex flex-col gap-4 lg:col-span-3">
        {challengers.map((c, i) => {
          const score = c.scores?.total ?? c.scores?.overall ?? 0;
          const t = tierFor(score);
          const barColor = score >= 75 ? "#4B87F5" : score >= 50 ? "#1257C4" : "#DC2626";
          const medal = c.rank === 2
            ? "from-primary-100 via-primary-300 to-primary-500 text-white"
            : "from-accent-200 via-accent-400 to-accent-600 text-white";
          return (
            <a
              key={c.id ?? c.rank}
              href={hrefFor(c, sessionId)}
              className="ht-engraved spotlight-card stagger-item group flex items-center gap-4 rounded-2xl border border-[var(--theme-border)] px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              style={{ animationDelay: `${(i + 1) * 120}ms` }}
            >
              <span
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${medal} text-sm font-black shadow-md`}
                title={`Rank #${c.rank}`}
              >
                {c.rank}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-black text-[var(--theme-text)]">
                    {c.evaluation?.name || c.fileName}
                  </span>
                  <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-black ${t.cls}`}>
                    {t.label}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-[12px] font-semibold text-[var(--theme-text-muted)]">
                  {c.evaluation?.headline || c.fileName}
                </span>
                <span className="ht-bar ht-bar--grow mt-2 block" style={{ color: barColor }}>
                  <span className="bar-grow" style={{ width: `${score}%`, background: barColor }} />
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-xl font-black font-mono text-[var(--theme-text)]">
                  <CountUp value={score} duration={1200} delay={(i + 1) * 140} />%
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--theme-text-muted)]">
                  Match
                </span>
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
