/**
 * InterviewCalendar — month-grid calendar for the HR sessions page.
 *
 * Marks every day that has at least one HR session with a scheduled
 * interview date (chosen when the session is created). Multiple sessions
 * on one day stack into dots; hovering/focusing a marked day shows the
 * session names + times, and clicking a session opens it.
 *
 * No date library — the grid is built with plain Date math around the
 * user's local timezone.
 */
import { useMemo, useState } from "react";
import Icon from "./ui/Icon";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Local YYYY-MM-DD key for a Date (never toISOString — that's UTC). */
export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameMonth(date, year, month) {
  return date.getFullYear() === year && date.getMonth() === month;
}

function buildGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const weeks = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w += 1) {
    const week = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function prettyTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function MonthNav({ label, onPrev, onNext, onToday, canReset }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous month"
          className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-3 py-1.5 text-sm font-bold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 shadow-2xs transition-all cursor-pointer"
        >
          &larr;
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next month"
          className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-3 py-1.5 text-sm font-bold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 shadow-2xs transition-all cursor-pointer"
        >
          &rarr;
        </button>
      </div>
      <h3 className="text-base font-extrabold text-[var(--theme-text,#0f172a)]" aria-live="polite">
        {label}
      </h3>
      <button
        type="button"
        onClick={onToday}
        disabled={!canReset}
        className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-3 py-1.5 text-xs font-bold text-primary-600 hover:bg-[var(--theme-bg)]/85 shadow-2xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Today
      </button>
    </div>
  );
}

export default function InterviewCalendar({ sessions = [], onOpenSession }) {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  const byDay = useMemo(() => {
    const map = new Map();
    for (const s of sessions) {
      if (!s?.interviewDate) continue;
      const d = parseDateKey(s.interviewDate);
      if (!d) continue;
      const key = dateKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return map;
  }, [sessions]);

  const weeks = useMemo(() => buildGrid(view.year, view.month), [view]);
  const monthLabel = new Date(view.year, view.month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
  const onTodayMonth = sameMonth(today, view.year, view.month);

  const markedCount = byDay.size;

  const moveMonth = (delta) =>
    setView(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  const goToday = () => setView({ year: today.getFullYear(), month: today.getMonth() });

  return (
    <section
      className="rounded-3xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-5 sm:p-6 shadow-xs"
      aria-label="Interview calendar"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-[var(--theme-text,#0f172a)]">
              <Icon name="calendar" className="h-4.5 w-4.5" />
              Interview Calendar
            </h2>
            <p className="mt-1 text-sm font-medium text-[var(--theme-text-muted,#475569)]">
              {markedCount > 0
                ? `${markedCount} day${markedCount === 1 ? "" : "s"} with scheduled interviews across your sessions.`
                : "Days with scheduled interview sessions appear here."}
            </p>
          </div>
          <MonthNav
            label={monthLabel}
            onPrev={() => moveMonth(-1)}
            onNext={() => moveMonth(1)}
            onToday={goToday}
            canReset={!onTodayMonth}
          />
        </div>

        <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label={monthLabel}>
          {WEEKDAYS.map((wd) => (
            <div
              key={wd}
              role="columnheader"
              className="pb-1 text-center text-[11px] font-black uppercase tracking-wider text-[var(--theme-text-muted,#64748b)]"
            >
              {wd}
            </div>
          ))}
          {weeks.flat().map((day) => {
            const key = dateKey(day);
            const daySessions = byDay.get(key) || [];
            const inMonth = sameMonth(day, view.year, view.month);
            const isToday = sameMonth(day, today.getFullYear(), today.getMonth()) && day.getDate() === today.getDate();
            const hasSessions = daySessions.length > 0;
            return (
              <div
                key={key}
                role="gridcell"
                aria-label={`${day.toDateString()}${hasSessions ? ` — ${daySessions.length} interview session${daySessions.length === 1 ? "" : "s"}` : ""}`}
                title={
                  hasSessions
                    ? daySessions.map((s) => `${s.name} · ${prettyTime(s.createdAt)}`).join("\n")
                    : undefined
                }
                className={`group relative flex min-h-[64px] flex-col rounded-xl border p-1.5 transition-all sm:min-h-[76px] ${
                  hasSessions
                    ? "border-primary-300/70 bg-primary-500/10 hover:border-primary-400 hover:shadow-md"
                    : "border-[var(--theme-border,#e2e8f0)]"
                } ${inMonth ? "" : "opacity-35"} ${isToday ? "ring-2 ring-primary-400/60" : ""}`}
              >
                <span
                  className={`text-[11px] font-bold ${
                    isToday
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white"
                      : "text-[var(--theme-text-muted,#64748b)]"
                  }`}
                >
                  {day.getDate()}
                </span>
                {hasSessions && (
                  <span className="mt-auto flex flex-col gap-1">
                    {daySessions.slice(0, 2).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onOpenSession?.(s)}
                        title={`Open ${s.name}`}
                        className="w-full truncate rounded-md bg-primary-600 px-1.5 py-0.5 text-left text-[10px] font-bold text-white hover:bg-primary-700 transition-colors cursor-pointer"
                      >
                        {s.name}
                      </button>
                    ))}
                    {daySessions.length > 2 && (
                      <span className="px-1 text-[10px] font-bold text-primary-600">
                        +{daySessions.length - 2} more
                      </span>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs font-medium text-[var(--theme-text-muted,#475569)]">
          <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-primary-500 align-middle" />
          Scheduled interview · click a session chip to open it
        </p>
      </div>
    </section>
  );
}
