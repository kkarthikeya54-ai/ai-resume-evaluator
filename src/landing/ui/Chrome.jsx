import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePhase, getScrollState, PHASE_NAMES } from '../utils/scroll'
import { Logo, Wordmark, CTAButton } from './kit'

/* Boot preloader — the document "assembles" before the reveal.
   Interval-driven (not rAF) so throttled webviews can never strand it. */
export function Preloader({ onDone }) {
  const [progress, setProgress] = useState(0)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const start = performance.now()
    const dur = 1400
    const iv = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / dur)
      setProgress(Math.round(100 * (1 - Math.pow(1 - p, 3))))
      if (p >= 1) {
        clearInterval(iv)
        setTimeout(() => { setGone(true); onDone?.() }, 350)
      }
    }, 50)
    return () => clearInterval(iv)
  }, [])

  return (
    <AnimatePresence>
      {!gone && (
        <motion.div
          className="rankora-preloader"
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
        >
          <motion.div exit={{ scale: 1.15, opacity: 0, transition: { duration: 0.5 } }}>
            <Logo size={44} />
          </motion.div>
          <div className="rankora-preloader__bar">
            <motion.span style={{ width: `${progress}%` }} />
          </div>
          <span className="rankora-preloader__pct">{progress}%</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* Fixed top nav */
export function Nav({ onCta, ctaLabel = 'Sign In' }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`rankora-nav ${scrolled ? 'is-scrolled' : ''}`}>
      <a
        className="rankora-nav__brand"
        href="#top"
        onClick={(e) => { e.preventDefault(); window.__rankoraScrollTo?.(0) }}
      >
        <Logo size={26} />
        <Wordmark size={19} />
      </a>
      <div className="rankora-nav__links">
        <button onClick={() => window.__rankoraScrollTo?.(0.3275)}>Intelligence</button>
        <button onClick={() => window.__rankoraScrollTo?.(0.625)}>Roadmap</button>
        <button onClick={() => window.__rankoraScrollTo?.(0.785)}>For HR</button>
      </div>
      <CTAButton className="rankora-nav__cta" onClick={onCta}>{ctaLabel}</CTAButton>
    </nav>
  )
}

/* Progress hairline at the very top */
export function ScrollProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf
    const tick = () => {
      setP(getScrollState().target)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="rankora-progress" aria-hidden="true">
      <span style={{ transform: `scaleX(${p})` }} />
    </div>
  )
}

/* Footer — quiet, editorial */
export function Footer() {
  return (
    <footer className="rankora-footer">
      <div>
        <Logo size={20} />
        <Wordmark size={16} />
      </div>
      <p>One resume in. An entire career system out.</p>
      <span className="rankora-footer__fine">© {new Date().getFullYear()} HireTire — Placement Readiness &amp; Recruiter Intelligence</span>
    </footer>
  )
}
