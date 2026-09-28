import * as THREE from 'three'

/**
 * One continuous camera journey. Scroll (0..1) maps onto these stops with
 * smoothstep easing between neighbours, so the ride is never linear.
 */
export const STOPS = [
  { pos: [0.0, 0.1, 7.15], look: [0, 0.05, 0], fov: 37 },  // prologue — face to face with the resume
  { pos: [0.0, 0.45, 12.6], look: [0, 0.25, 0], fov: 47 }, // hero — world revealed
  { pos: [0.6, 0.55, 8.2], look: [0, 0.3, 0], fov: 44 },   // parsing — closer, document opens
  { pos: [0.0, 0.2, 13.5], look: [0, 0, 0], fov: 52 },     // universe — inside the skill space
  { pos: [0.0, 0.1, 9.6], look: [0, 0.4, 0], fov: 44 },    // readiness — the score object
  { pos: [0.0, 0.15, 10.4], look: [0, 0.1, 0], fov: 46 },  // gap — two structures
  { pos: [0.0, 0.0, 13.2], look: [0, 0.2, 0], fov: 52 },   // roadmap — long winding path
  { pos: [0.0, 0.35, 10.2], look: [0, 0.3, 0], fov: 46 },  // prep — orbit stage
  { pos: [0.0, 0.5, 14.2], look: [0, 0.2, 0], fov: 54 },   // hr — wide field of candidates
  { pos: [0.0, 0.2, 11.0], look: [0, 0.15, 0], fov: 46 },  // chat — focused interface
  { pos: [0.0, 0.1, 7.6], look: [0, 0.05, 0], fov: 40 },   // collapse — intimate again
]

const aPos = new THREE.Vector3()
const aLook = new THREE.Vector3()
const bPos = new THREE.Vector3()
const bLook = new THREE.Vector3()

function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

/** Interpolate camera state at scroll progress p. Returns fov. */
export function sampleCamera(p, outPos, outLook) {
  const n = STOPS.length - 1
  const raw = p * n
  const i = Math.min(n - 1, Math.max(0, Math.floor(raw)))
  const f = smoothstep(Math.min(1, Math.max(0, raw - i)))

  const A = STOPS[i]
  const B = STOPS[i + 1]

  aPos.fromArray(A.pos)
  bPos.fromArray(B.pos)
  outPos.copy(aPos).lerp(bPos, f)

  aLook.fromArray(A.look)
  bLook.fromArray(B.look)
  outLook.copy(aLook).lerp(bLook, f)

  return A.fov + (B.fov - A.fov) * f
}
