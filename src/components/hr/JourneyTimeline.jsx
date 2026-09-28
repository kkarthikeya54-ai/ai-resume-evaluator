import Icon from "../ui/Icon";

const STEPS = [
  { key: "uploaded", label: "Uploaded", icon: "file" },
  { key: "parsed", label: "Parsed", icon: "docStack" },
  { key: "evaluated", label: "AI Evaluated", icon: "bot" },
  { key: "shortlisted", label: "Shortlisted", icon: "star" },
];

/**
 * JourneyTimeline — horizontal candidate journey with sequential node
 * light-up (staggered entrance + connector fill). Derived purely from the
 * candidate record — no fake states.
 */
export default function JourneyTimeline({ candidate }) {
  const done = [
    true,
    Boolean(candidate?.evaluation?.name || candidate?.evaluation?.skills?.length),
    candidate?.scores?.total != null,
    Boolean(candidate?.shortlisted),
  ];

  return (
    <nav
      aria-label="Candidate journey"
      className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 sm:p-5 shadow-2xs"
    >
      <ol className="flex items-center">
        {STEPS.map((step, i) => {
          const complete = done[i];
          return (
            <li
              key={step.key}
              className="stagger-item flex flex-1 items-center last:flex-none"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    complete
                      ? "border-primary-500 bg-primary-50 text-primary-600 shadow-[0_0_18px_-4px_rgb(232_93_63/0.5)]"
                      : "border-[var(--theme-border)] bg-[var(--theme-bg)]/50 text-[var(--theme-text-muted)]"
                  }`}
                >
                  <Icon name={step.icon} className="h-4 w-4" />
                </span>
                <span
                  className={`text-[11px] font-black uppercase tracking-wide whitespace-nowrap ${
                    complete ? "text-[var(--theme-text)]" : "text-[var(--theme-text-muted)]"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`mx-2 mb-5 h-0.5 min-w-6 flex-1 rounded-full transition-colors duration-500 ${
                    done[i + 1] ? "bg-primary-500/70" : "bg-[var(--theme-border)]"
                  }`}
                  style={{ transitionDelay: `${(i + 1) * 150}ms` }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
