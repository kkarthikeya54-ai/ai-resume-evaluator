/**
 * Kanban pipeline board with drag-and-drop stage changes.
 *
 * Motion language matches the landing: cards fly between columns on a
 * layoutId spring, sibling cards reflow on the same spring, and a rejected
 * drop (released outside any stage) snaps back to origin. Dragging is a
 * functional interaction, so it stays available under reduced motion —
 * only the springs collapse to instant transitions.
 *
 * Gating:
 *  - Fine pointers may start a drag anywhere on the card that isn't an
 *    interactive control; touch pointers must start on the grip handle so
 *    page scroll is never hijacked.
 *  - Buttons, selects, and links never start a drag.
 *  - Stage changes go through the same onUpdateStatus chain as the arrows
 *    and dropdown (optimistic state → localStorage → cloud PATCH), so DnD
 *    is purely a UI affordance over the existing persistence path.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useDragControls, useReducedMotion } from "framer-motion";
import Icon from "../ui/Icon";
import SpotlightCard from "../ui/SpotlightCard";

export const STAGES = [
  {
    id: "screened",
    icon: "clipboard",
    title: "Screened / Applied",
    accent: "bg-[#0B1F3A]/[0.06] text-[var(--theme-text)]",
  },
  {
    id: "shortlisted",
    icon: "star",
    title: "Shortlisted for Interview",
    accent: "bg-primary-100 text-primary-700",
  },
  {
    id: "interviewing",
    icon: "phone",
    title: "Interviewing",
    accent: "bg-primary-100 text-primary-700",
  },
  {
    id: "hired",
    icon: "checkCircle",
    title: "Hired",
    accent: "bg-emerald-500/15 text-emerald-700",
  },
];

// Landing-grade spring: quick pickup, soft settle.
const SPRING = { type: "spring", stiffness: 520, damping: 40, mass: 0.9 };

// Candidates without an explicit status live in the first stage.
export const colIdFor = (c) =>
  c.status && STAGES.some((s) => s.id === c.status) ? c.status : "screened";

function GripDots({ className = "" }) {
  return (
    <svg viewBox="0 0 10 16" fill="currentColor" aria-hidden="true" className={className}>
      {[2, 8, 14].map((cy) => (
        <g key={cy}>
          <circle cx="2.5" cy={cy} r="1.4" />
          <circle cx="7.5" cy={cy} r="1.4" />
        </g>
      ))}
    </svg>
  );
}

function KanbanCard({
  c,
  idx,
  boardEntered,
  reduced,
  dragging,
  onStartDrag,
  onDragMove,
  onDragEnd,
  onToggleShortlist,
  onUpdateStatus,
  sessionId,
}) {
  const controls = useDragControls();
  const score = c.scores?.total ?? c.scores?.overall ?? 0;
  const stageIds = STAGES.map((s) => s.id);
  const stageIdx = stageIds.indexOf(c.status || "screened");
  const canAdvance = stageIdx >= 0 && stageIdx < stageIds.length - 1;
  const canRetreat = stageIdx > 0;
  const name = c.evaluation?.name || c.fileName;
  const draggable = Boolean(onUpdateStatus);

  return (
    <motion.div
      layout
      layoutId={c.id}
      initial={boardEntered ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduced ? { duration: 0 } : SPRING}
      style={{
        pointerEvents: dragging ? "none" : undefined,
        zIndex: dragging ? 50 : undefined,
      }}
      drag={draggable}
      dragListener={false}
      dragControls={controls}
      dragSnapToOrigin
      dragMomentum={false}
      whileDrag={
        reduced
          ? undefined
          : { scale: 1.04, rotate: 1.2, boxShadow: "0 24px 48px -12px rgba(0,0,0,0.5)" }
      }
      onPointerDown={(e) => onStartDrag(e, c.id, controls)}
      onDrag={onDragMove}
      onDragEnd={onDragEnd}
      className="relative"
    >
      <SpotlightCard
        className={`rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 shadow-2xs hover:shadow-md transition-all space-y-2.5 ${
          dragging ? "ring-2 ring-primary-400/50" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {draggable && (
              <span
                data-drag-handle
                title="Drag to change stage"
                aria-hidden="true"
                className="shrink-0 cursor-grab text-[var(--theme-text-muted)]/60 transition-colors hover:text-[var(--theme-text)] active:cursor-grabbing"
                style={{ touchAction: "none" }}
              >
                <GripDots className="h-3.5 w-2.5" />
              </span>
            )}
            <h4 className="truncate text-xs font-black text-[var(--theme-text)]">{name}</h4>
          </div>
          <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-black text-emerald-700">
            {score}%
          </span>
        </div>

        <div className="line-clamp-2 text-[12px] font-medium text-[var(--theme-text-muted)]">
          {c.evaluation?.summary || "Match summary extracted."}
        </div>

        {onUpdateStatus && (
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              disabled={!canRetreat}
              onClick={() => onUpdateStatus(c.id, stageIds[stageIdx - 1])}
              className="rounded-lg px-2 py-1 text-xs font-extrabold text-[var(--theme-text-muted)] transition-all hover:bg-[#0B1F3A]/[0.06] disabled:cursor-not-allowed disabled:opacity-30"
              title="Move to previous stage"
            >
              ←
            </button>
            <select
              value={c.status || "screened"}
              onChange={(e) => onUpdateStatus(c.id, e.target.value)}
              className="flex-1 cursor-pointer rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] px-2 py-1 text-xs font-bold text-[var(--theme-text-muted)] focus:border-primary-500 focus:outline-none"
              aria-label={`Change stage for ${name}`}
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title.split(" / ")[0]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!canAdvance}
              onClick={() => onUpdateStatus(c.id, stageIds[stageIdx + 1])}
              className="rounded-lg px-2 py-1 text-xs font-extrabold text-[var(--theme-text-muted)] transition-all hover:bg-[#0B1F3A]/[0.06] disabled:cursor-not-allowed disabled:opacity-30"
              title="Move to next stage"
            >
              →
            </button>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[var(--theme-border)] pt-2 text-xs">
          <button
            type="button"
            onClick={() => onToggleShortlist(c.id)}
            className={`cursor-pointer rounded-lg px-2.5 py-1 font-extrabold transition-all ${
              c.shortlisted
                ? "bg-emerald-600 text-white"
                : "border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:bg-[#0B1F3A]/[0.06]"
            }`}
          >
            {c.shortlisted ? (
              <span className="inline-flex items-center gap-1">
                <Icon name="star" className="h-3 w-3" /> Shortlisted
              </span>
            ) : (
              "+ Shortlist"
            )}
          </button>

          {sessionId && (
            <Link to={`/candidate/${c.id}?session=${sessionId}`} className="font-bold text-primary-700 hover:underline">
              View Details &rarr;
            </Link>
          )}
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export default function KanbanBoard({
  candidates = [],
  sessionId,
  onToggleShortlist,
  onUpdateStatus,
}) {
  const reduced = useReducedMotion() ?? false;
  const [dragId, setDragId] = useState(null);
  const dragIdRef = useRef(null);
  const [hoverCol, setHoverCol] = useState(null);
  // Entrance stagger only for the board's first paint; remounts after a
  // drop (the card re-renders into its new column) must appear instantly
  // so the layoutId flight reads as one continuous move.
  // Backgrounded/throttled tabs never tick rAF, so the entrance animation
  // would freeze at opacity:0 (same failure class as useCountUp). Mount
  // instantly-hidden tabs fully animated.
  const [boardEntered, setBoardEntered] = useState(
    () => typeof document !== "undefined" && document.visibilityState === "hidden"
  );

  useEffect(() => {
    const t = setTimeout(() => setBoardEntered(true), 900);
    return () => clearTimeout(t);
  }, []);

  const columns = useMemo(
    () =>
      STAGES.map((s) => ({
        ...s,
        candidates: candidates.filter((c) => colIdFor(c) === s.id),
      })),
    [candidates]
  );

  const pointFrom = (e, info) =>
    typeof e?.clientX === "number" ? { x: e.clientX, y: e.clientY } : info?.point ?? null;

  // The dragged card has pointer-events disabled while dragging, so the
  // element under the cursor always belongs to the target column.
  const colAt = (x, y) =>
    document.elementFromPoint(x, y)?.closest?.("[data-drop-col]")?.getAttribute("data-drop-col") ||
    null;

  const handleDragMove = (e, info) => {
    if (!dragIdRef.current) return;
    const p = pointFrom(e, info);
    if (!p) return;
    const col = colAt(p.x, p.y);
    setHoverCol((prev) => (prev === col ? prev : col));
  };

  const handleDragEnd = (e, info) => {
    const id = dragIdRef.current;
    dragIdRef.current = null;
    setDragId(null);
    const p = pointFrom(e, info);
    const col = p ? colAt(p.x, p.y) : null;
    setHoverCol(null);
    if (!id || !col || !onUpdateStatus) return;
    const cand = candidates.find((c) => c.id === id);
    if (cand && colIdFor(cand) !== col) onUpdateStatus(id, col);
  };

  const startDrag = (e, id, controls) => {
    if (!onUpdateStatus || dragIdRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const t = e.target;
    const onHandle = Boolean(t.closest?.("[data-drag-handle]"));
    if (!onHandle && t.closest?.("button, select, a, input, textarea")) return;
    // Touch drags only start on the handle (scroll safety).
    if (e.pointerType !== "mouse" && !onHandle) return;
    e.preventDefault();
    dragIdRef.current = id;
    setDragId(id);
    controls.start(e);
  };

  const dragging = dragId != null;

  return (
    <div className="space-y-3">
      {onUpdateStatus && candidates.length > 0 && (
        <p className="flex items-center gap-2 text-[12px] font-medium text-[var(--theme-text-muted)]">
          <GripDots className="h-3 w-2 opacity-70" />
          Drag candidates between stages — a drop outside a stage springs back.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4" data-kanban-board>
        {columns.map((col) => (
          <div
            key={col.id}
            data-drop-col={col.id}
            className={`relative space-y-4 rounded-3xl border p-4 transition-all duration-200 ${
              hoverCol === col.id
                ? "border-primary-400/70 bg-primary-500/10 ring-2 ring-primary-400/30"
                : dragging
                  ? "border-[var(--theme-border)] bg-[var(--theme-card)]/5 opacity-60"
                  : "border-[var(--theme-border)] bg-[var(--theme-card)]/5"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-2">
              <h3 className="flex items-center gap-1.5 text-xs font-black tracking-wide text-[var(--theme-text)]">
                <Icon name={col.icon} className="h-3.5 w-3.5" />
                {col.title}
              </h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${col.accent}`}>
                {col.candidates.length}
              </span>
            </div>

            <div className="min-h-[300px] space-y-3">
              {col.candidates.length === 0 ? (
                <div
                  className={`rounded-2xl border border-dashed p-6 text-center text-xs font-medium transition-colors ${
                    hoverCol === col.id
                      ? "border-primary-400/60 text-[var(--theme-text)]"
                      : "border-[var(--theme-border)] text-[var(--theme-text-muted)]"
                  }`}
                >
                  {dragging ? "Drop to move here" : "No candidates in this stage"}
                </div>
              ) : (
                col.candidates.map((c, i) => (
                  <KanbanCard
                    key={c.id}
                    c={c}
                    idx={i}
                    boardEntered={boardEntered}
                    reduced={reduced}
                    dragging={dragId === c.id}
                    onStartDrag={startDrag}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                    onToggleShortlist={onToggleShortlist}
                    onUpdateStatus={onUpdateStatus}
                    sessionId={sessionId}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
