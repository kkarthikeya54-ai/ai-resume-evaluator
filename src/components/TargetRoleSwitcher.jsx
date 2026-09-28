import { useEffect, useState } from "react";
import Icon from "./ui/Icon";
import { useGemini } from "../hooks/useGemini";
import { subscribeToRun } from "../utils/analysisEvents";

export default function TargetRoleSwitcher({ resumeText }) {
  const { loading, error, data, execute } = useGemini();
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(
    () => subscribeToRun((text) => text && execute("generateTargetRoles", text)),
    [execute]
  );

  const roles = Array.isArray(data?.roles) ? data.roles : null;
  const active = selectedRole || roles?.[0] || null;

  return (
    <div className="rounded-3xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 sm:p-8 shadow-xs my-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-primary-600">
            Career Target Simulator
          </span>
          <h3 className="text-lg font-extrabold text-[var(--theme-text,#0f172a)] mt-0.5">
            Evaluate Score Against Target Roles
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {active && (
            <span className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold text-primary-600">
              Target: {active.title}
            </span>
          )}
          <button
            onClick={() => execute("generateTargetRoles", resumeText)}
            disabled={loading || !resumeText}
            className="rounded-xl bg-primary-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer active:scale-95"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-700 mb-4">
          {error}
        </div>
      )}

      {!roles && !loading && !error && (
        <p className="text-sm font-medium text-[var(--theme-text-muted,#64748b)]">
          Select &quot;Analyze&quot; to evaluate your resume against realistic target roles in your field.
        </p>
      )}

      {roles && (
        <>
          {/* Role Picker Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all cursor-pointer ${
                  active?.id === role.id
                    ? "border-primary-500 bg-primary-50/80 shadow-xs ring-2 ring-primary-500/20"
                    : "border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 hover:bg-[var(--theme-card,#ffffff)]"
                }`}
              >
                <span className="text-2xl mb-1">{role.icon}</span>
                <span className="text-xs font-bold text-[var(--theme-text,#0f172a)] leading-tight">{role.title}</span>
                <span className={`text-xs font-extrabold mt-1 ${
                  role.score >= 80 ? "text-primary-600" : role.score >= 70 ? "text-amber-600" : "text-red-600"
                }`}>
                  {Math.round(role.score)}% Match
                </span>
              </button>
            ))}
          </div>

          {/* Selected Role Breakdown */}
          {active && (
            <div className="rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold uppercase text-primary-600 mb-2">
                  ✓ Top Matched Skills for {active.title}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(active.strengths || []).map((s, i) => (
                    <span key={i} className="rounded-md border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-600">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase text-shortlist-700 mb-2">
                  <Icon name="alert" className="h-3.5 w-3.5 inline-block -mt-0.5 mr-1" />Skills to Acquire for {active.title}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(active.gaps || []).map((g, i) => (
                    <span key={i} className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-shortlist-700">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
