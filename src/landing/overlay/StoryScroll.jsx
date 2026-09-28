import { useRef } from 'react'

/**
 * Story scroll track. The 3D scene is fixed; this tall invisible container
 * gives the browser ~20 viewport-heights of scroll to drive the journey.
 * The story is compressed (see measureKnee in utils/scroll.js) so it ends
 * just before the product showcase below the track enters the viewport.
 * Section overlays are position:fixed and fade in/out by phase, so this
 * element is intentionally empty.
 */
export default function StoryScroll({ children }) {
  return (
    <div
      ref={useRef(null)}
      style={{ height: '2000vh' }}
      aria-hidden="true"
    />
  )
}
