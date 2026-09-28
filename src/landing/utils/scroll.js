import { useEffect, useState } from 'react'

/**
 * Global scroll store. A single rAF loop reads window.scrollY and writes
 * window.__rankora { scroll, velocity, phase }. The R3F scene reads these
 * values inside useFrame (zero React re-renders); React overlays subscribe
 * with usePhase() for visibility and interactions.
 */
const PHASE_BOUNDS = [0, 0.075, 0.155, 0.275, 0.38, 0.465, 0.585, 0.665, 0.745, 0.825, 0.93, 1.001]

export const PHASE_NAMES = [
  'prologue',
  'hero',
  'parsing',
  'universe',
  'readiness',
  'gap',
  'roadmap',
  'prep',
  'hr',
  'chat',
  'collapse',
]

function phaseOf(p) {
  for (let i = 0; i < PHASE_BOUNDS.length - 1; i++) {
    if (p < PHASE_BOUNDS[i + 1]) return i
  }
  return PHASE_NAMES.length - 1
}

/* Handoff knee — the fraction of physical page scroll at which the story
 * must be fully told. The product showcase lives below the track; the story
 * is compressed so its finale completes just before the showcase can peek
 * into the viewport. Measured from the DOM (never hard-coded) and remeasured
 * on resize/layout settle. With no showcase, knee = 1 (story fills the page). */
function measureKnee() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 1
  const el = document.querySelector('.rankora-showcase')
  if (!el) return 1
  const vh = window.innerHeight
  const max = Math.max(1, document.documentElement.scrollHeight - vh)
  const peek = (el.getBoundingClientRect().top + window.scrollY - vh) / max
  if (!(peek > 0.05) || peek >= 1) return 1
  return Math.min(1, Math.max(0.5, peek * 0.985))
}

export function initScrollStore() {
  if (typeof window === 'undefined') return () => {}
  // StrictMode-safe: tear down any previous loop before starting a new one
  if (window.__rankoraTeardown) {
    window.__rankoraTeardown()
    window.__rankoraTeardown = null
  }
  window.__rankora = {
    scroll: 0,
    target: 0,
    velocity: 0,
    phase: 0,
    knee: measureKnee(),
    pointer: { x: 0, y: 0, tx: 0, ty: 0 },
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }
  let raf = 0
  let last = window.scrollY
  const tick = () => {
    const s = window.__rankora
    const y = window.scrollY
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    s.target = Math.min(1, (y / max) / (s.knee || 1))
    s.velocity = y - last
    last = y
    // critically-damped approach for buttery camera motion
    s.scroll += (s.target - s.scroll) * 0.085
    if (Math.abs(s.target - s.scroll) < 0.00005) s.scroll = s.target
    const ph = phaseOf(s.target)
    if (ph !== s.phase) {
      s.phase = ph
      window.dispatchEvent(new CustomEvent('rankora:phase', { detail: ph }))
    }
    // pointer easing (also handled here so scene reads one source of truth)
    s.pointer.x += (s.pointer.tx - s.pointer.x) * 0.06
    s.pointer.y += (s.pointer.ty - s.pointer.y) * 0.06
    raf = requestAnimationFrame(tick)
  }
  // Sync target + phase from the real scroll position. Used by the scroll
  // listener, a capture listener (some webviews only fire it on document),
  // and a light poll that catches throttled-rAF environments.
  const sync = () => {
    const s = window.__rankora
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    const y = window.scrollY || document.documentElement.scrollTop || 0
    const t = Math.min(1, (y / max) / (s.knee || 1))
    if (Math.abs(t - s.target) < 0.0000001) return
    s.target = t
    const ph = phaseOf(t)
    if (ph !== s.phase) {
      s.phase = ph
      window.dispatchEvent(new CustomEvent('rankora:phase', { detail: ph }))
    }
  }
  const onPointer = (e) => {
    const s = window.__rankora
    s.pointer.tx = (e.clientX / window.innerWidth) * 2 - 1
    s.pointer.ty = -(e.clientY / window.innerHeight) * 2 + 1
  }
  window.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('scroll', sync, { passive: true })
  document.addEventListener('scroll', sync, { passive: true, capture: true })
  // poll: survives rAF throttling so DOM overlays never desync
  const poll = setInterval(sync, 120)
  // layout settles after fonts/images — remeasure the handoff knee, then
  // keep it fresh on resize
  const remeasure = () => { if (window.__rankora) window.__rankora.knee = measureKnee() }
  window.addEventListener('resize', remeasure)
  const settle = setTimeout(remeasure, 1200)
  raf = requestAnimationFrame(tick)
  const dispose = () => {
    cancelAnimationFrame(raf)
    clearInterval(poll)
    clearTimeout(settle)
    window.removeEventListener('resize', remeasure)
    window.removeEventListener('pointermove', onPointer)
    window.removeEventListener('scroll', sync)
    document.removeEventListener('scroll', sync, { capture: true })
    window.__rankoraTeardown = null
  }
  window.__rankoraTeardown = dispose
  return dispose
}

/** Subscribe to discrete phase changes (0..10) */
export function usePhase() {
  const [phase, setPhase] = useState(() =>
    typeof window !== 'undefined' && window.__rankora ? window.__rankora.phase : 0
  )
  useEffect(() => {
    const onPhase = (e) => setPhase(e.detail)
    window.addEventListener('rankora:phase', onPhase)
    return () => window.removeEventListener('rankora:phase', onPhase)
  }, [])
  return phase
}

export const getScrollState = () =>
  typeof window !== 'undefined' && window.__rankora
    ? window.__rankora
    : { scroll: 0, target: 0, velocity: 0, phase: 0, pointer: { x: 0, y: 0, tx: 0, ty: 0 }, reduced: false }
