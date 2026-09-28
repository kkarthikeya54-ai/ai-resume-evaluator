export const CORAL = '#1D6FF2'
export const PINE = '#0B1F3A'
export const IVORY = '#F7FAFF'
export const SAGE = '#5B8DEF'
export const GRAPHITE = '#2E2E2E'

export function lerp(a, b, t) {
  return a + (b - a) * t
}

export function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max)
}

export function mapRange(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
