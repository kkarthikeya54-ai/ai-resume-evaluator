import { Link } from "react-router-dom";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-xl text-base font-semibold transition-all duration-200 active:scale-[0.98] select-none";

const variants = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 hover:shadow-md hover:shadow-primary-600/20 btn-shine font-bold",
  secondary:
    "border border-[var(--theme-border)] bg-[var(--theme-card)] text-[var(--theme-text)] hover:text-[var(--theme-text)] hover:border-primary-300 hover:bg-[#0B1F3A]/[0.04] shadow-2xs font-bold",
  ghost: "text-[var(--theme-text-muted)] hover:text-primary-600 hover:bg-primary-50/50 font-bold",
};

export default function Button({
  variant = "primary",
  to,
  href,
  className = "",
  children,
  ...rest
}) {
  const cls = `${base} ${variants[variant]} ${className}`;
  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
