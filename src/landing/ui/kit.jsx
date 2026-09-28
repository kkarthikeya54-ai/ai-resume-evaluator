import { motion } from 'framer-motion'

/* HireTire mark — the winners' podium with the #1 ring above it.
   Blue & white edition for the landing canvas. */
export function Logo({ size = 26, stroke = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <rect x="18" y="70" width="24" height="32" rx="5" fill="#93C5FD" />
      <rect x="48" y="46" width="24" height="56" rx="5" fill="#FFFFFF" />
      <rect x="78" y="82" width="24" height="20" rx="5" fill="#BFDBFE" />
      <circle cx="60" cy="30" r="15" fill="none" stroke="#F7FAFF" strokeWidth="6" />
      <line x1="60" y1="15" x2="60" y2="27" stroke="#F7FAFF" strokeWidth="7" />
    </svg>
  )
}

/* Wordmark for nav / footer — size is fluid, driven by CSS (--us unit) */
export function Wordmark() {
  return (
    <span className="rankora-wordmark">
      HireTire
    </span>
  )
}

/* Primary pill button with cinematic hover (blue & white edition) */
export function CTAButton({ children, onClick, variant = 'primary', className = '' }) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      onClick={onClick}
      className={`rankora-cta rankora-cta--${variant} ${className}`}
    >
      {children}
    </motion.button>
  )
}

/* Small uppercase label above headings */
export function Eyebrow({ children, className = '' }) {
  return (
    <span className={`rankora-eyebrow ${className}`}>{children}</span>
  )
}

/* Headline that reveals word-by-word as it enters the viewport */
export function AnimatedHeadline({ text, className = '' }) {
  const words = String(text).split(' ')
  return (
    <span className={`rankora-headline ${className}`}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="rankora-headline__word" style={{ '--wi': i }}>
          {w}
        </span>
      ))}
    </span>
  )
}

/* Lede paragraph with a soft rise-in */
export function Lede({ children, delay = 0, className = '' }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`rankora-lede ${className}`}
    >
      {children}
    </motion.p>
  )
}
