import { Link } from "react-router-dom";

const PRODUCT_NAME = "HireTire";

const sizes = {
  sm: { box: "h-8 w-8 rounded-lg", text: "text-lg", icon: 18 },
  md: { box: "h-9 w-9 rounded-lg", text: "text-lg", icon: 19 },
  lg: { box: "h-10 w-10 rounded-lg", text: "text-xl", icon: 22 },
};

/**
 * HireTire mark — the winners' podium with the #1 ring above it.
 * Blue & white edition: ivory ring + white center step on a blue field.
 */
export function LogoMark({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <rect x="18" y="70" width="24" height="32" rx="5" fill="currentColor" opacity="0.45" />
      <rect x="48" y="46" width="24" height="56" rx="5" fill="currentColor" />
      <rect x="78" y="82" width="24" height="20" rx="5" fill="currentColor" opacity="0.25" />
      <circle cx="60" cy="30" r="15" fill="none" stroke="#F7FAFF" strokeWidth="6" />
      <line x1="60" y1="15" x2="60" y2="27" stroke="#F7FAFF" strokeWidth="7" />
    </svg>
  );
}

export default function Logo({ to, size = "sm", className = "" }) {
  const s = sizes[size] || sizes.sm;
  const destination = to ?? "/";
  return (
    <Link
      to={destination}
      title={PRODUCT_NAME}
      className={`flex items-center gap-2 ${className}`}
    >
      <span
        className={`flex ${s.box} items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-500/25`}
      >
        <LogoMark size={s.icon} />
      </span>
      <span className={`font-bold ${s.text} text-[var(--theme-text,#0f172a)] tracking-tight`}>
        Hire<span className="text-primary-600">Tire</span>
      </span>
    </Link>
  );
}
