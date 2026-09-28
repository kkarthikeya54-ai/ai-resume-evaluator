import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--theme-bg)]/85 text-[var(--theme-text,#0f172a)]">
      <div className="max-w-md w-full text-center rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-10 shadow-xs">
        <p className="font-mono text-4xl font-black text-primary-600">404</p>
        <h1 className="mt-3 text-xl font-extrabold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm font-medium text-[var(--theme-text-muted,#64748b)]">
          The page you're looking for doesn't exist or may have moved.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-700 shadow-xs transition-all"
          >
            Go Home
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-6 py-2.5 text-sm font-semibold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 shadow-2xs transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
