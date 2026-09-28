export default function FormField({ label, type, value, onChange, placeholder, autoComplete }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-[var(--theme-text,#0f172a)] mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-500/20 shadow-2xs transition-all"
      />
    </div>
  );
}
