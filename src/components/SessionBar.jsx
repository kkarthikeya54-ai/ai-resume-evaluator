import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../services/role";
import { listSessions } from "../services/sessionStore";

export default function SessionBar({ role, sessionId, name }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (!user?.uid || !role) return;
    let cancelled = false;
    listSessions(user.uid, role).then((list) => {
      if (!cancelled) setSessions(list);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, role]);

  const handleChange = (e) => {
    const id = e.target.value;
    if (!id) return;
    navigate(role === ROLES.HR ? `/hr?session=${id}` : `/app?session=${id}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-4 py-3 shadow-xs">
      <span className="text-xs font-black uppercase tracking-wider text-primary-600">Session</span>
      <select
        value={sessionId || ""}
        onChange={handleChange}
        className="min-w-0 flex-1 rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-3 py-2 text-sm font-bold text-[var(--theme-text,#0f172a)] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
      >
        {sessions.length === 0 && <option value="">No sessions</option>}
        {sessions.map((session) => (
          <option key={session.id} value={session.id} className="bg-[var(--theme-card,#ffffff)] text-[var(--theme-text,#0f172a)]">
            {session.name}
          </option>
        ))}
      </select>
      <span className="hidden sm:inline text-sm font-semibold text-[var(--theme-text-muted,#64748b)]">{name || "Untitled Session"}</span>
      <button
        onClick={() => navigate("/sessions")}
        className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-3.5 py-2 text-sm font-bold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 shadow-2xs transition-all cursor-pointer active:scale-95"
      >
        Manage Sessions
      </button>
    </div>
  );
}
