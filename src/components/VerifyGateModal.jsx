import { useState } from "react";

export default function VerifyGateModal({ onContinue, onResend, onClose }) {
  const [state, setState] = useState({ status: "idle", error: null });

  const handleResend = async () => {
    if (state.status === "sending") return;
    setState({ status: "sending", error: null });
    try {
      await onResend();
      setState({ status: "sent", error: null });
    } catch (err) {
      setState({ status: "idle", error: err.message || "Could not send verification email." });
    }
  };

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="modal-card w-full max-w-md rounded-2xl border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-[var(--theme-text)]">Verify your email first</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--theme-text-muted)]">
          Unverified accounts can still explore the app, but running analyses requires a confirmed
          email to keep your data tied to a real account.
        </p>
        {state.status === "sent" && (
          <p className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-700">
            Verification email sent — check your inbox, then refresh.
          </p>
        )}
        {state.error && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700">
            {state.error}
          </p>
        )}
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={state.status === "sending"}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {state.status === "sending" ? "Sending..." : "Send verification email"}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-2.5 text-sm font-medium text-[var(--theme-text)] hover:border-primary/40 hover:bg-[var(--theme-card-hover)] hover:text-[var(--theme-primary-hover)] transition-colors"
          >
            Continue anyway
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg px-4 py-2 text-xs text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
