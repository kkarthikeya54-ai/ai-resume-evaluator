import { useState, useMemo, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import Icon from "../ui/Icon";
import ConfettiBurst from "../ui/ConfettiBurst";

const COLUMNS = [
  { key: "select", label: "", sortable: false, w: "w-12" },
  { key: "rank", label: "Rank", sortable: false, w: "w-16" },
  { key: "name", label: "Candidate", sortable: false, w: "w-[240px]" },
  { key: "tier", label: "Tier", sortable: false, w: "w-16" },
  { key: "overall", label: "Overall Match", sortable: true, w: "w-28" },
  { key: "skills", label: "Skills", sortable: true, w: "w-20" },
  { key: "experience", label: "Experience", sortable: true, w: "w-24" },
  { key: "education", label: "Education", sortable: true, w: "w-24" },
  { key: "projects", label: "Projects", sortable: true, w: "w-24" },
  { key: "keywords", label: "Keywords", sortable: true, w: "w-24" },
  { key: "action", label: "Action", sortable: false, w: "w-32" },
];

/* Sum of the fixed column widths above — the table never shrinks below
   this, so narrow screens scroll sideways instead of crushing columns. */
const TABLE_MIN_WIDTH = 1120;

const SCORE_KEYS = ["skills", "experience", "education", "projects", "keywords"];
const ROW_HEIGHT = 56;
const FLIP_MS = 380;

function getTier(score) {
  if (score >= 90) return { label: "S+", bg: "bg-shortlist-100 text-shortlist-700 border-shortlist-300 shadow-2xs font-black" };
  if (score >= 80) return { label: "S", bg: "bg-primary-100 text-primary-900 border-primary-300 font-extrabold" };
  if (score >= 70) return { label: "A", bg: "bg-accent-100 text-primary-600 border-accent-200 font-bold" };
  if (score >= 60) return { label: "B", bg: "bg-accent-100 text-accent-600 border-accent-300/40 font-semibold" };
  return { label: "C", bg: "bg-[#0B1F3A]/[0.06] text-[var(--theme-text-muted)] border-[var(--theme-border)] font-medium" };
}

function openCandidate(candidate, sessionId, navigate) {
  if (candidate?.id) {
    navigate(
      sessionId ? `/candidate/${candidate.id}?session=${sessionId}` : `/candidate/${candidate.id}`
    );
    return;
  }
  if (candidate?.url) {
    window.open(candidate.url, "_blank", "noopener");
    return;
  }
  const blob = new Blob([candidate?.resumeText || ""], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function scoreTone(value) {
  if (value >= 75) return "text-primary-600 font-bold";
  if (value >= 50) return "text-shortlist-700 font-bold";
  return "text-red-600 font-bold";
}

function scoreChipTone(value) {
  if (value >= 75) return "bg-primary-50 text-primary-600 border-primary-200";
  if (value >= 50) return "bg-shortlist-50 text-shortlist-700 border-shortlist-200";
  return "bg-red-500/10 text-red-700 border-red-500/30";
}

function Cell({ children, className = "" }) {
  return <div className={`flex items-center px-3.5 py-3 text-sm ${className}`}>{children}</div>;
}

/* Gradient rank medals for the podium (top 3). */
function Medal({ rank }) {
  const styles = {
    1: "from-primary-300 via-primary-500 to-primary-700 text-white shadow-primary-500/40",
    2: "from-primary-100 via-primary-200 to-primary-400 text-white shadow-primary-500/30",
    3: "from-accent-200 via-accent-400 to-accent-600 text-white shadow-accent-500/30",
  };
  return (
    <span
      title={`Rank #${rank}`}
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-[12px] font-black shadow-md ${styles[rank]}`}
    >
      {rank === 1 ? <Icon name="crown" className="h-3.5 w-3.5" /> : rank}
    </span>
  );
}

/* Micro score-bar that fills on mount under a cell value — lit tip dot. */
function MicroBar({ value, delay = 0 }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const color = v >= 75 ? "#4B87F5" : v >= 50 ? "#1257C4" : "#DC2626";
  return (
    <span className="ht-bar ht-bar--grow mt-1.5 block" style={{ color }} aria-hidden="true">
      <span
        className="bar-grow"
        style={{ width: `${v}%`, background: color, animationDelay: `${delay}ms` }}
      />
    </span>
  );
}

function Row({ candidate, sessionId, navigate, isSelected, onToggleSelect, onToggleShortlist, style }) {
  const overall = candidate.scores?.total ?? candidate.scores?.overall ?? 0;
  const rowRef = useRef(null);
  const [burst, setBurst] = useState(0);
  const wasShortlisted = useRef(candidate.shortlisted);

  const handleSpot = (e) => {
    const el = rowRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  };

  const handleShortlist = () => {
    if (!candidate.shortlisted && wasShortlisted.current !== true) setBurst((b) => b + 1);
    wasShortlisted.current = candidate.shortlisted;
    onToggleShortlist?.(candidate.id);
  };

  const tier = getTier(overall);
  const skills = candidate.evaluation?.skills || [];

  return (
    <div
      ref={rowRef}
      data-candidate-id={candidate.id}
      onMouseMove={handleSpot}
      className={`absolute left-0 right-0 flex items-stretch border-b border-[var(--theme-border)] hover:bg-primary-500/8 spotlight-card transition-colors duration-200 min-w-[1120px] ${
        isSelected ? "bg-primary-500/12" : ""
      }`}
      style={style}
    >
      {/* select */}
      <Cell className="w-12 shrink-0">
        <input
          type="checkbox"
          aria-label={`Select ${candidate.evaluation?.name || candidate.fileName} for compare`}
          checked={isSelected}
          onChange={() => onToggleSelect?.(candidate.id)}
          className="h-4 w-4 cursor-pointer accent-[var(--theme-primary)]"
        />
      </Cell>

      {/* rank */}
      <Cell className="w-16 shrink-0">
        {candidate.rank != null && candidate.rank <= 3 ? (
          <Medal rank={candidate.rank} />
        ) : (
          <span className="inline-flex rounded-full border border-[var(--theme-border)] bg-[var(--theme-card)] px-2 py-0.5 text-xs font-bold text-[var(--theme-text-muted)]">
            #{candidate.rank ?? "—"}
          </span>
        )}
      </Cell>

      {/* name + shortlist */}
      <Cell className="w-[240px] shrink-0">
        <div className="relative flex items-start gap-2 min-w-0">
          {burst > 0 && <ConfettiBurst trigger={burst} />}
          <button
            type="button"
            onClick={handleShortlist}
            aria-label={`${candidate.shortlisted ? "Remove" : "Add"} ${candidate.evaluation?.name || candidate.fileName} ${candidate.shortlisted ? "from" : "to"} shortlist`}
            title={candidate.shortlisted ? "Remove from shortlist" : "Add to shortlist"}
            className={`mt-0.5 shrink-0 transition-transform active:scale-125 duration-150 ${
              candidate.shortlisted
                ? "text-shortlist-500 scale-110"
                : "text-[var(--theme-text-muted)] hover:text-shortlist-400"
            }`}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill={candidate.shortlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.977 10.1c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => openCandidate(candidate, sessionId, navigate)}
              className="text-left font-extrabold text-[var(--theme-text)] hover:text-primary-600 transition-colors block truncate max-w-full"
            >
              {candidate.evaluation?.name || candidate.fileName}
            </button>
            <div className="flex items-center gap-1 mt-0.5 min-w-0 overflow-hidden">
              <span className="text-[12px] text-[var(--theme-text-muted)] font-medium shrink-0">{candidate.fileName}</span>
              {skills.slice(0, 2).map((s) => (
                <span key={s} className="rounded-md border border-[var(--theme-border)] bg-[#0B1F3A]/[0.04] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--theme-text-muted)] shrink-0">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Cell>

      {/* tier */}
      <Cell className="w-16 shrink-0">
        <span className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-black ${tier.bg}`}>
          {tier.label}
        </span>
      </Cell>

      {/* overall */}
      <Cell className="w-28 shrink-0">
        <span className="flex w-full flex-col">
          <span className={`inline-flex self-start rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${scoreChipTone(overall)}`}>
            {overall}%
          </span>
          <MicroBar value={overall} delay={80} />
        </span>
      </Cell>

      {/* score columns */}
      {SCORE_KEYS.map((key, i) => {
        const val = key === "keywords" ? candidate.scores?.keywordMatch : candidate.scores?.[key];
        return (
          <Cell key={key} className={`w-20 shrink-0 ${scoreTone(val)}`}>
            <span className="flex w-full flex-col">
              <span>{val != null ? `${val}%` : "—"}</span>
              {val != null && <MicroBar value={val} delay={120 + i * 60} />}
            </span>
          </Cell>
        );
      })}

      {/* action */}
      <Cell className="w-32 shrink-0">
        <button
          type="button"
          onClick={() => openCandidate(candidate, sessionId, navigate)}
          className="rounded-xl border border-primary-400/30 bg-primary-500/10 px-3 py-1.5 text-xs font-bold text-primary-600 hover:border-primary-300/60 hover:bg-primary-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
        >
          View Report &rarr;
        </button>
      </Cell>
    </div>
  );
}

export default function HrTable({
  candidates,
  sessionId,
  selectedIds,
  onToggleSelect,
  onToggleShortlist,
}) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState("rank");
  const [sortDir, setSortDir] = useState("asc");
  const parentRef = useRef(null);
  const prevPosRef = useRef(new Map());

  const value = (candidate, key) =>
    key === "keywords"
      ? candidate.scores?.keywordMatch
      : key === "overall"
        ? candidate.scores?.total ?? candidate.scores?.overall
        : candidate.scores?.[key];

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!candidates?.length) return [];
    const s = [...candidates].sort((a, b) => {
      if (sortKey === "rank") return (a.rank ?? 0) - (b.rank ?? 0);
      return (value(a, sortKey) ?? -1) - (value(b, sortKey) ?? -1);
    });
    if (sortDir === "desc") s.reverse();
    return s;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, sortKey, sortDir]);

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  /* FLIP row reordering: when the sorted order changes, rows glide from
     their previous offset to the new one instead of jump-cutting. */
  useLayoutEffect(() => {
    const container = parentRef.current;
    if (!container) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const newPositions = new Map();
    for (const vr of virtualizer.getVirtualItems()) {
      const c = sorted[vr.index];
      if (!c) continue;
      newPositions.set(c.id, vr.start);
      if (reduceMotion) continue;
      const el = container.querySelector(`[data-candidate-id="${CSS.escape(String(c.id))}"]`);
      if (!el) continue;
      const prev = prevPosRef.current.get(c.id);
      if (prev != null && Math.abs(prev - vr.start) > 2) {
        el.animate(
          [{ transform: `translateY(${prev - vr.start}px)` }, { transform: "translateY(0px)" }],
          { duration: FLIP_MS, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
        );
      }
    }
    prevPosRef.current = newPositions;
  }, [sorted, virtualizer]);

  if (!sorted.length) {
    return (
      <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-8 text-center shadow-xs">
        <p className="text-sm font-bold text-[var(--theme-text-muted)]">No candidates match the current filter.</p>
        <p className="text-xs text-[var(--theme-text-muted)] mt-1">Try switching filter tabs or clearing your search term.</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="ht-engraved min-h-[420px] max-h-[70vh] w-full overflow-auto rounded-3xl border border-[var(--theme-border)] shadow-xs"
    >
      {/* Sticky header — rendered outside virtual list. w-max + min-width
          let it stretch to the container but never shrink below the full
          column set, creating the horizontal scrollbar. */}
      <div
        className="sticky top-0 z-10 flex items-stretch border-b border-[var(--theme-border)] bg-[var(--theme-card)]/95 backdrop-blur-md w-max min-w-[1120px]"
        style={{ height: ROW_HEIGHT }}
      >
        {COLUMNS.map((col) => (
          <div
            key={col.key}
            className={`flex items-center px-3.5 py-3 text-xs font-bold uppercase text-[var(--theme-text-muted)] whitespace-nowrap ${col.w}`}
          >
            {col.sortable ? (
              <button
                type="button"
                onClick={() => handleSort(col.key)}
                className={`inline-flex items-center gap-1 hover:text-[var(--theme-text)] transition-colors ${
                  sortKey === col.key ? "text-primary-600 font-extrabold" : ""
                }`}
              >
                {col.label}
                <span className="text-[11px] leading-none">
                  {sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                </span>
              </button>
            ) : (
              col.label
            )}
          </div>
        ))}
      </div>

      {/* Virtual rows — same min-width as the header so header and rows
          scroll together as one table. */}
      <div
        className="relative w-max min-w-[1120px]"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const candidate = sorted[virtualRow.index];
          return (
            <Row
              key={candidate.id}
              candidate={candidate}
              sessionId={sessionId}
              navigate={navigate}
              isSelected={selectedIds?.has(candidate.id)}
              onToggleSelect={onToggleSelect}
              onToggleShortlist={onToggleShortlist}
              style={{
                height: ROW_HEIGHT,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
