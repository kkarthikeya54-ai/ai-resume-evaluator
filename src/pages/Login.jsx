import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { logIn, logInWithGoogle, resetPassword } from "../services/auth";
import { getRole, getRoleRedirect } from "../services/role";
import FormField from "../components/FormField";
import Logo from "../components/Logo";
import { getAuthErrorMessage } from "../utils/authErrors";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (user && role) return <Navigate to={getRoleRedirect(role)} replace />;

  const finishLogin = (authUser) => {
    const storedRole = authUser?.uid ? getRole(authUser.uid) : null;
    navigate(storedRole ? getRoleRedirect(storedRole) : "/onboarding");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const authUser = await logIn(email, password);
      finishLogin(authUser);
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const authUser = await logInWithGoogle();
      finishLogin(authUser);
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setNotice(null);
    if (!email) {
      setError("Enter your email above to receive a reset link.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setNotice("Password reset link sent. Check your inbox.");
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg)]/85 flex flex-col items-center justify-center px-4 py-12 relative z-10 transition-colors duration-300">
      <div className="mb-6 rounded-2xl bg-[var(--theme-card,#ffffff)] p-3 shadow-md border border-[var(--theme-border,#e2e8f0)]">
        <Logo size="lg" />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-8 sm:p-10 shadow-2xl">
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--theme-text,#0f172a)] text-center mb-1.5 tracking-tight">Welcome Back</h1>
        <p className="text-xs sm:text-sm font-bold text-[var(--theme-text-muted,#475569)] text-center mb-8">
          Sign in to continue to your AI evaluation dashboard.
        </p>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-black text-red-700 shadow-2xs">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-black text-emerald-700 shadow-2xs">
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <div>
            <FormField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="mt-2 text-xs font-bold text-primary-600 hover:underline disabled:opacity-50 cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50 shadow-md hover:bg-primary-700 transition-all active:scale-95 cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-[var(--theme-border,#e2e8f0)]" />
          <span className="text-[12px] font-black text-[var(--theme-text-muted,#475569)] uppercase tracking-widest">OR</span>
          <div className="flex-1 h-px bg-[var(--theme-border,#e2e8f0)]" />
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-4 py-3 text-xs font-extrabold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-card,#ffffff)] disabled:opacity-50 shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="mt-6 text-xs sm:text-sm font-semibold text-[var(--theme-text-muted,#475569)] text-center">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-black text-primary-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
