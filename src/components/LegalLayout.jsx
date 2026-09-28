import { Link } from "react-router-dom";
import Logo from "./Logo";

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-[var(--theme-text,#0f172a)]">{title}</h2>
      {children}
    </section>
  );
}

export default function LegalLayout({ updatedAt, title, intro, children }) {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
        <Link
          to="/"
          title="HireTire — Home"
          className="inline-flex items-center gap-2 mb-8 text-sm font-semibold text-primary-600 hover:underline"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 text-white shadow-md">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8" />
              <path d="M8 17h5" />
            </svg>
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--theme-text,#0f172a)]">{title}</h1>
            {updatedAt && (
              <p className="text-xs font-semibold text-[var(--theme-text-muted,#475569)] mt-1">
                Last updated: {updatedAt}
              </p>
            )}
          </div>
        </div>

        {intro && (
          <p className="mb-10 text-sm leading-relaxed text-[var(--theme-text-muted,#475569)] font-medium">
            {intro}
          </p>
        )}

        <div className="space-y-8 divide-y divide-[var(--theme-border,#e2e8f0)]">
          {children}
        </div>
      </div>
      <div className="flex justify-center pb-10">
        <Logo size="sm" />
      </div>
    </div>
  );
}

export { Section };