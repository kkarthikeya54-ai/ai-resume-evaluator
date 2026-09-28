import { ROLES } from "../services/role";

const OPTIONS = [
  {
    value: ROLES.STUDENT,
    label: "Student",
    description: "Evaluate my resume & get career insights",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    value: ROLES.HR,
    label: "HR / Recruiter",
    description: "Screen & rank candidate resumes",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
];

export default function RolePicker({ value, onChange }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-[var(--theme-text-muted)]">I am a</span>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account role">
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`relative rounded-xl border p-4 text-left transition-all ${
                selected
                  ? "border-primary-500 bg-primary-50/70 ring-2 ring-primary-500/20 shadow-xs"
                  : "border-[var(--theme-border)] bg-[var(--theme-card)] hover:border-primary-300 shadow-2xs"
              }`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? "bg-primary-100 text-primary-600" : "bg-[#0B1F3A]/[0.06] text-[var(--theme-text-muted)]"}`}>
                {option.icon}
              </span>
              <span className={`mt-3 block text-sm font-bold ${selected ? "text-primary-900" : "text-[var(--theme-text)]"}`}>
                {option.label}
              </span>
              <span className="mt-1 block text-xs text-[var(--theme-text-muted)] leading-snug">{option.description}</span>
              {selected && (
                <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white shadow-xs">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
