import { useEffect, useRef } from 'react'

/**
 * HiggsfieldLayer — cinematic atmosphere layer.
 * Soft drifting aurora fields in the brand palette (coral / sage / ivory),
 * rendered at low resolution for a smooth volumetric wash. In production
 * this is where Higgsfield-generated motion plates composite in as masked
 * video sheets. No film grain: the page stays clean and crisp.
 */
export default function HiggsfieldLayer() {
  const ref = useRef()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    let t = 0
    const W = (canvas.width = 480)
    const H = (canvas.height = 270)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const paintFrame = (t) => {
      ctx.clearRect(0, 0, W, H)

      // drifting aurora fields
      const blobs = [
        { c: '#1D6FF2', a: 0.05, x: 0.3 + Math.sin(t) * 0.18, y: 0.35 + Math.cos(t * 0.8) * 0.15 },
        { c: '#5B8DEF', a: 0.045, x: 0.7 + Math.cos(t * 0.7) * 0.2, y: 0.6 + Math.sin(t * 0.6) * 0.18 },
        { c: '#F7FAFF', a: 0.02, x: 0.5 + Math.sin(t * 0.4) * 0.25, y: 0.2 + Math.cos(t * 0.5) * 0.1 },
      ]
      blobs.forEach((b) => {
        const g = ctx.createRadialGradient(b.x * W, b.y * H, 0, b.x * W, b.y * H, W * 0.45)
        g.addColorStop(0, b.c)
        g.addColorStop(1, 'transparent')
        ctx.globalAlpha = b.a
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
      })
      ctx.globalAlpha = 1
    }

    // Reduced motion: paint one composed frame, no animation loop
    if (reduced) {
      paintFrame(0.7)
      return
    }

    const draw = () => {
      t += 0.0035
      paintFrame(t)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={ref} className="rankora-higgsfield" aria-hidden="true" />
}
