let cached = null

export function detectEnvironment() {
  if (cached) return cached

  const nav = typeof navigator !== 'undefined' ? navigator : {}
  const ua = nav.userAgent || ''

  const isMobile = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(ua) ||
    (nav.maxTouchPoints > 1 && /Macintosh/.test(ua))
  const isTablet = /iPad|Tablet/i.test(ua)

  const cores = nav.hardwareConcurrency || 4
  const memory = nav.deviceMemory || nav.memory || 4

  const reducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const coarsePointer = typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches

  let gpu = 'unknown'
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''
      gpu = String(renderer).toLowerCase()
    }
  } catch { /* noop */ }

  const weakGpu = /mali|adreno 5|adreno 6[0-3]|powervr|swiftshader|llvmpipe|intel.*(hd|uhd) graphics (5|6[0-2])0/.test(gpu)

  let tier = 'high'
  if (isMobile || reducedMotion || weakGpu) tier = 'low'
  else if (cores <= 4 || memory <= 4 || isTablet) tier = 'mid'

  cached = {
    isMobile: isMobile || isTablet,
    isTablet,
    reducedMotion,
    coarsePointer,
    cores,
    memory,
    gpu,
    tier,
    particleCount: tier === 'low' ? 220 : tier === 'mid' ? 700 : 1600,
    dpr: tier === 'low' ? [1, 1.25] : [1, 1.75],
    shadows: tier === 'high',
  }
  return cached
}
