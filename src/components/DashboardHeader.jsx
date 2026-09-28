import { useState } from "react";
import Icon from "./ui/Icon";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../services/role";
import Logo from "./Logo";

export default function DashboardHeader() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isHr = role === ROLES.HR;
  const isAccountActive = location.pathname === "/account";
  const isSessionsActive = location.pathname === "/sessions";
  const isDashboardActive = location.pathname === "/app" || location.pathname === "/hr";

  return (
    <header className="border-b border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)]/95 backdrop-blur-xl sticky top-0 z-40 shadow-xs transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Brand Logo */}
        <Logo size="md" />

        {/* Desktop Navigation Control Bar */}
        <div className="hidden md:flex items-center gap-3">
          {/* Mode Pill Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3 py-1 text-xs font-black text-primary-600 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
            {isHr ? "HR Recruiter" : "Student Mode"}
          </span>

          {/* Profile User Pill */}
          <span className="text-xs font-extrabold text-[var(--theme-text-muted,#475569)] max-w-[160px] truncate bg-[var(--theme-bg)]/85 border border-[var(--theme-border,#e2e8f0)] px-2.5 py-1 rounded-xl">
            {isHr ? "Recruiter Workspace" : user?.displayName || user?.email || "Student"}
          </span>

          {/* Nav Links Group */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-[var(--theme-border,#e2e8f0)]">
            <Link
              to={isHr ? "/hr" : "/app"}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                isDashboardActive
                  ? "bg-primary-600 border-primary-600 text-white shadow-2xs font-black"
                  : "border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85"
              }`}
            >
              <Icon name="chart" className="h-3.5 w-3.5" /> Workspace
            </Link>

            <Link
              to="/sessions"
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                isSessionsActive
                  ? "bg-primary-600 border-primary-600 text-white shadow-2xs font-black"
                  : "border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85"
              }`}
            >
              <Icon name="folder" className="h-3.5 w-3.5" /> Sessions
            </Link>

            <Link
              to="/account"
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                isAccountActive
                  ? "bg-primary-600 border-primary-600 text-white shadow-2xs font-black"
                  : "border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85"
              }`}
            >
              <Icon name="settings" className="h-3.5 w-3.5" /> Account
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="btn-destructive rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-3.5 py-1.5 text-xs font-extrabold text-[var(--theme-text,#0f172a)] hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Status Badge & Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-2.5 py-0.5 text-[12px] font-black text-primary-600">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
            {isHr ? "HR" : "Student"}
          </span>

          <button
            type="button"
            className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-2 text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 active:scale-95 transition-all shadow-2xs"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Sheet */}
      {open && (
        <div className="md:hidden border-t border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)]/95 backdrop-blur-2xl shadow-xl animate-fade-in">
          <div className="px-4 py-4 space-y-3">
            <div className="space-y-1.5">
              <Link
                to={isHr ? "/hr" : "/app"}
                onClick={() => setOpen(false)}
                className={`block rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition-colors ${
                  isDashboardActive ? "bg-primary-600 text-white" : "text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85"
                }`}
              >
                <Icon name="chart" className="h-4 w-4 inline-block -mt-0.5 mr-1.5" />Workspace Dashboard
              </Link>

              <Link
                to="/sessions"
                onClick={() => setOpen(false)}
                className={`block rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition-colors ${
                  isSessionsActive ? "bg-primary-600 text-white" : "text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85"
                }`}
              >
                <Icon name="folder" className="h-4 w-4 inline-block -mt-0.5 mr-1.5" />Hiring &amp; Analysis Sessions
              </Link>

              <Link
                to="/account"
                onClick={() => setOpen(false)}
                className={`block rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition-colors ${
                  isAccountActive ? "bg-primary-600 text-white" : "text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85"
                }`}
              >
                <Icon name="settings" className="h-4 w-4 inline-block -mt-0.5 mr-1.5" />Profile &amp; Settings
              </Link>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  handleLogout();
                }}
                className="block w-full text-center rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-black text-red-700 hover:bg-red-500/15 transition-colors shadow-2xs cursor-pointer mt-2"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
