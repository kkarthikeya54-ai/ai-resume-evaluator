import { useState } from "react";

export default function EmailVerificationBanner({ user, onVerify }) {
  const [state, setState] = useState({ status: "idle", error: null });

  if (!user || user.emailVerified) return null;

  const handleVerify = async () => {
    setState({ status: "sending", error: null });
    try {
      await onVerify();
      setState({ status: "sent", error: null });
    } catch (err) {
      setState({ status: "idle", error: err.message || "Could not send verification email." });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-shortlist-500/30 bg-shortlist-500/10 p-4">
      <div>
        <p className="text-sm font-medium text-shortlist-700">Verify your email address</p>
        <p className="text-xs text-shortlist-600 mt-1">
          Confirm your email to secure your account and keep your saved resume accessible.
        </p>
        {state.error && <p className="text-xs text-red-700 mt-1">{state.error}</p>}
      </div>
      <button
        onClick={handleVerify}
        disabled={state.status === "sending"}
        className="shrink-0 rounded-lg border border-shortlist-500/40 bg-white/60 px-4 py-2 text-xs font-semibold text-shortlist-700 hover:bg-shortlist-500/10 hover:text-shortlist-800 disabled:opacity-50 transition-colors"
      >
        {state.status === "sending"
          ? "Sending..."
          : state.status === "sent"
            ? "Email sent — check your inbox"
            : "Resend verification email"}
      </button>
    </div>
  );
}
