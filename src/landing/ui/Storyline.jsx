import { useEffect, useState } from 'react'
import { usePhase } from '../utils/scroll'
import { PHASE_STORY } from './story'

/**
 * The story caption pinned to the bottom edge. Crossfades with each phase
 * and steps aside when something else owns the bottom band: the prologue
 * scroll hint, or the footer at the end of the journey.
 */
export default function Storyline() {
  const phase = usePhase()
  const beat = PHASE_STORY[Math.min(phase, PHASE_STORY.length - 1)]
  const [footerNear, setFooterNear] = useState(false)
  const [key, setKey] = useState(0)

  useEffect(() => { setKey(k => k + 1) }, [phase])

  // watch the footer AND the showcase: once either scrolls into view the
  // caption yields — the story is over, the interface owns the screen
  useEffect(() => {
    const els = document.querySelectorAll('.rankora-footer, .rankora-showcase')
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => setFooterNear(entries.some((e) => e.isIntersecting)),
      { rootMargin: '0px 0px -8% 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const hidden = phase === 0 || footerNear

  return (
    <div className={`rankora-storycaption ${hidden ? 'is-hidden' : ''}`} aria-hidden="true">
      <span key={`c${key}`} className="rankora-storycaption__text">{beat.caption}</span>
      <span className="rankora-storycaption__line" />
    </div>
  )
}
