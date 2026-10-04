import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../services/role";
import {
  listSessions,
  createSession,
  renameSession,
  deleteSession,
  putSession,
  updateSessionMeta,
} from "../services/sessionStore";
import { loadSession, clearSession } from "../services/hrStore";
import DashboardHeader from "../components/DashboardHeader";
import InterviewCalendar from "../components/InterviewCalendar";
import PassRateSlider from "../components/hr/PassRateSlider";
import Icon from "../components/ui/Icon";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function interviewDayLabel(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function sessionSummary(session, role) {
  const payload = session.payload || {};
  if (role === ROLES.HR) {
    const count = Array.isArray(payload.candidates) ? payload.candidates.length : 0;
    return count > 0 ? `${count} candidate${count === 1 ? "" : "s"} evaluated` : "No evaluations yet";
  }
  return payload.resumeText ? "Resume loaded" : "No resume yet";
}

function rulesPreview(payload) {
  const rules = String(payload?.config?.rules || "").trim();
  if (!rules) return null;
  const flat = rules.replace(/\s+/g, " ").trim();
  return flat.length > 90 ? `${flat.slice(0, 90)}…` : flat;
}

export default function SessionsPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [newInterviewDate, setNewInterviewDate] = useState("");
  const [newPassRate, setNewPassRate] = useState(0);
  const [dateEditingId, setDateEditingId] = useState(null);
  const [dateEditValue, setDateEditValue] = useState("");

  const refresh = useCallback(async () => {
    if (!user?.uid || !role) return;
    const list = await listSessions(user.uid, role);
    setSessions(list);
    setLoading(false);
  }, [user?.uid, role]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.uid || role !== ROLES.HR || loading || sessions.length > 0) return;
    let cancelled = false;
    loadSession(user.uid).then((legacy) => {
      if (cancelled || !legacy?.candidates?.length) return;
      createSession(user.uid, ROLES.HR, "Imported Session").then(async (record) => {
        if (cancelled || !record) return;
        await putSession({ ...record, payload: legacy });
        await clearSession(user.uid);
        refresh();
      });
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, role, loading, sessions.length, refresh]);

  const handleCreate = async () => {
    if (!user?.uid || !role || !newName.trim()) return;
    const record = await createSession(user.uid, role, newName, {
      interviewDate: isHr ? newInterviewDate : "",
      passRate: isHr ? newPassRate : null,
    });
    setCreating(false);
    setNewName("");
    setNewInterviewDate("");
    setNewPassRate(0);
    if (!record) return;
    navigate(role === ROLES.HR ? `/hr?session=${record.id}` : `/app?session=${record.id}`);
  };

  const handleOpen = (session) => {
    navigate(session.role === ROLES.HR ? `/hr?session=${session.id}` : `/app?session=${session.id}`);
  };

  const handleRename = async (session) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    await renameSession(session.id, renameValue);
    setRenamingId(null);
    refresh();
  };

  const handleDelete = async (session) => {
    if (!window.confirm(`Delete session "${session.name}"? This cannot be undone.`)) return;
    await deleteSession(session.id);
    refresh();
  };

  const handleSaveDate = async (session) => {
    await updateSessionMeta(session.id, { interviewDate: dateEditValue });
    setDateEditingId(null);
    refresh();
  };

  const isHr = role === ROLES.HR;

  return (
    <div className="min-h-screen bg-[var(--theme-bg)]/85 text-[var(--theme-text,#0f172a)] pb-12 transition-colors duration-300">
      <DashboardHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--theme-text,#0f172a)]">Your Sessions</h1>
            <p className="text-[var(--theme-text-muted,#475569)] mt-2">
              {isHr
                ? "Organize separate candidate screening sessions for each job opening."
                : "Manage separate resume analysis sessions for different target positions."}
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700 shadow-xs transition-all cursor-pointer"
          >
            + New Session
          </button>
        </section>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--theme-border)] border-t-primary-600" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-10 text-center shadow-xs">
            <p className="text-sm font-medium text-[var(--theme-text-muted,#475569)]">
              No sessions yet. Create your first session to get started.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="mt-6 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700 shadow-xs transition-all cursor-pointer"
            >
              Create Session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-5 shadow-xs hover:border-primary-400 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    {renamingId === session.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(session);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3 py-1.5 text-sm text-[var(--theme-text,#0f172a)] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      />
                    ) : (
                      <h2 className="text-lg font-bold text-[var(--theme-text,#0f172a)] leading-tight">{session.name}</h2>
                    )}
                    <span
                      className="shrink-0 rounded-md border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-2.5 py-0.5 text-xs font-bold text-primary-600"
                    >
                      {isHr ? "HR" : "Student"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-[var(--theme-text-muted,#475569)] font-medium">{sessionSummary(session, role)}</p>
                  {isHr && session.interviewDate && interviewDayLabel(session.interviewDate) && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700">
                      <Icon name="calendar" className="h-3.5 w-3.5" />
                      Interview: {interviewDayLabel(session.interviewDate)}
                    </p>
                  )}
                  {isHr && session.passRate > 0 && (
                    <p className="mt-2 text-xs font-bold text-[var(--theme-text-muted,#475569)]">
                      Pass rate: <span className="text-primary-600">{session.passRate}%</span>
                    </p>
                  )}
                  {isHr && rulesPreview(session.payload) && (
                    <p className="mt-2 rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3 py-2 text-xs text-[var(--theme-text-muted,#475569)]">
                      <span className="font-bold text-[var(--theme-text,#0f172a)]">Job rules: </span>
                      {rulesPreview(session.payload)}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[var(--theme-text-muted,#475569)] font-medium">Updated {formatDate(session.updatedAt)}</p>
                </div>

                {dateEditingId === session.id && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 p-2">
                    <input
                      type="date"
                      autoFocus
                      value={dateEditValue}
                      onChange={(e) => setDateEditValue(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-2.5 py-1.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] focus:outline-none focus:border-primary-500"
                      aria-label="Interview date"
                    />
                    <button
                      onClick={() => handleSaveDate(session)}
                      className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-700 transition-all cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setDateEditingId(null)}
                      className="rounded-lg px-2 py-1.5 text-xs font-bold text-[var(--theme-text-muted,#475569)] hover:text-[var(--theme-text,#0f172a)] transition-all cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="mt-5 flex items-center gap-2 pt-2 border-t border-[var(--theme-border,#e2e8f0)]">
                  <button
                    onClick={() => handleOpen(session)}
                    className="flex-1 rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 shadow-2xs transition-all cursor-pointer"
                  >
                    Open
                  </button>
                  {isHr && (
                    <button
                      onClick={() => {
                        setDateEditingId(session.id);
                        setDateEditValue(session.interviewDate || "");
                      }}
                      title={session.interviewDate ? "Change interview date" : "Set interview date"}
                      aria-label="Set interview date"
                      className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-3 py-2 text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 shadow-2xs transition-all cursor-pointer"
                    >
                      <Icon name="calendar" className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setRenamingId(session.id);
                      setRenameValue(session.name);
                    }}
                    className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-3.5 py-2 text-sm font-semibold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 shadow-2xs transition-all cursor-pointer"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDelete(session)}
                    className="rounded-xl border border-red-500/30 bg-[var(--theme-card,#ffffff)] px-3.5 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/10 shadow-2xs transition-all cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isHr && (
          <InterviewCalendar sessions={sessions} onOpenSession={handleOpen} />
        )}
      </main>

      {creating && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-primary-600/60 backdrop-blur-xs px-4">
          <div className="modal-card w-full max-w-sm rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 shadow-xl">
            <h2 className="text-lg font-extrabold text-[var(--theme-text,#0f172a)]">New Session</h2>
            <p className="mt-1 text-sm text-[var(--theme-text-muted,#475569)]">
              Name this session (e.g. &quot;Software Engineer&quot; or &quot;Data Science&quot;).
            </p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="Session name"
              className="mt-4 w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-4 py-2.5 text-sm text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 shadow-xs"
            />
            {isHr && (
              <>
                <div className="mt-4">
                  <label htmlFor="new-interview-date" className="mb-1.5 block text-sm font-bold text-[var(--theme-text,#0f172a)]">
                    Interview date <span className="text-xs font-normal text-[var(--theme-text-muted,#475569)]">(shown on the calendar)</span>
                  </label>
                  <input
                    id="new-interview-date"
                    type="date"
                    value={newInterviewDate}
                    onChange={(e) => setNewInterviewDate(e.target.value)}
                    className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-4 py-2.5 text-sm text-[var(--theme-text,#0f172a)] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 shadow-xs"
                  />
                </div>
                <div className="mt-4">
                  <PassRateSlider
                    value={newPassRate}
                    onChange={setNewPassRate}
                    candidateCount={null}
                    belowCount={null}
                    hint="Resumes scoring below this are rejected automatically once candidates are evaluated."
                  />
                </div>
              </>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setCreating(false)}
                className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-4 py-2 text-sm font-semibold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 shadow-2xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50 shadow-xs transition-all cursor-pointer"
              >
                Create &amp; Open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
