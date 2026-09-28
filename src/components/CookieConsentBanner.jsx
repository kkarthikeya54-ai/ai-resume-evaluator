import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const CONSENT_KEY = "airesume_cookie_notice_seen";
const CONSENT_VERSION = "1";

function hasSeen() {
  try {
    return localStorage.getItem(CONSENT_KEY) === CONSENT_VERSION;
  } catch {
    return true;
  }
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show after a short delay so it never blocks first paint.
    const t = window.setTimeout(() => {
      if (!hasSeen()) setVisible(true);
    }, 1200);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(CONSENT_KEY, CONSENT_VERSION);
    } catch {
      // best-effort; browser storage may be blocked
    }
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-md z-[60] rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)]/95 backdrop-blur-md p-5 shadow-2xl animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 border border-[var(--theme-border,#e2e8f0)] text-primary-600">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12.5l2.5 2.5L16 9.5" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="cookie-consent-title" className="text-sm font-extrabold text-[var(--theme-text,#0f172a)]">
            Privacy notice
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text-muted,#475569)] font-medium">
            This site stores data in your browser&rsquo;s local storage to keep you signed in,
            remember your settings, and save your sessions on your device. We do not set tracking
            cookies or embed third-party advertising.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl bg-primary-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-primary-700 transition-colors cursor-pointer"
            >
              Got it
            </button>
            <Link
              to="/cookies"
              className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2 text-xs font-bold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-card,#ffffff)] transition-colors"
            >
              Cookie Policy
            </Link>
            <Link
              to="/privacy"
              className="rounded-xl px-3.5 py-2 text-xs font-bold text-primary-600 hover:underline"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}