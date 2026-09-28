import { useState } from "react";
import Icon from "../ui/Icon";

const STATUS_LABELS = {
  screened: "Screened",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  hired: "Hired",
};

const MAX_SHOWN = 4;

/** One-line human description of a single candidate change. */
function describeChange(ch) {
  const name = ch.name || `#${ch.rank ?? "?"}`;
  if (ch.shortlisted && ch.status) {
    return `${name}: ${ch.shortlisted.after ? "added to shortlist" : "removed from shortlist"} · stage → ${STATUS_LABELS[ch.status.after] || ch.status.after}`;
  }
  if (ch.shortlisted) {
    return `${name}: ${ch.shortlisted.after ? "added to shortlist" : "removed from shortlist"}`;
  }
  return `${name}: stage → ${STATUS_LABELS[ch.status.after] || ch.status.after}`;
}

/**
 * CopilotAuditLog — the change history of copilot-applied shortlist/status
 * edits, each with an Undo button. Entries are newest first and come from
 * the session's `copilotAudit` array, so the log survives reloads.
 */
export default function CopilotAuditLog({ entries = [], onUndo }) {
  const [expanded, setExpanded] = useState(false);
  const [busyId, setBusyId] = useState(null);
  if (!entries.length) return null;

  const shown = expanded ? entries : entries.slice(0, MAX_SHOWN);

  const handleUndo = async (entry) => {
    if (busyId) return;
    setBusyId(entry.id);
    try {
      await onUndo?.(entry.id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ht-engraved rounded-2xl border border-[var(--theme-border)] shadow-xs">
      <div className="flex items-center justify-between border-b border-[var(--theme-border)] px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-[var(--theme-text)]">
          <Icon name="refresh" className="h-4 w-4 text-accent-600" />
          Copilot change log
        </h3>
        <span className="rounded-full bg-[#0B1F3A]/[0.04] border border-[var(--theme-border)] px-2.5 py-0.5 text-[12px] font-bold text-[var(--theme-text-muted)]">
          {entries.length}
        </span>
      </div>
      <ul className="divide-y divide-[var(--theme-border)]">
        {shown.map((entry) => (
          <li key={entry.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--theme-text)]">
                  {new Date(entry.appliedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {entry.changes.map((ch, idx) => (
                    <li
                      key={`${entry.id}-${idx}`}
                      className="text-xs font-medium text-[var(--theme-text-muted)]"
                    >
                      {describeChange(ch)}
                    </li>
                  ))}
                </ul>
                {entry.reason && (
                  <p className="mt-1 truncate text-[12px] italic text-[var(--theme-text-muted)]/80">
                    “{entry.reason}”
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleUndo(entry)}
                disabled={busyId === entry.id}
                className="shrink-0 rounded-lg border border-[var(--theme-border)] bg-[#0B1F3A]/[0.04] px-2.5 py-1 text-[12px] font-bold text-[var(--theme-text-muted)] hover:border-primary-300/50 hover:text-primary-600 disabled:opacity-50 shadow-2xs transition-all"
              >
                Undo
              </button>
            </div>
          </li>
        ))}
      </ul>
      {entries.length > MAX_SHOWN && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full border-t border-[var(--theme-border)] px-4 py-2 text-[12px] font-bold text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-all"
        >
          {expanded ? "Show less" : `Show ${entries.length - MAX_SHOWN} more`}
        </button>
      )}
    </div>
  );
}
