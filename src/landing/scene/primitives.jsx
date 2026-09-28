import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getScrollState } from '../utils/scroll'
import { CORAL, SAGE, IVORY } from '../utils/colors'
import { particleTexture, glowTexture } from '../utils/textures'

/** Frame-rate independent critically-damped approach. */
export function damp(current, target, lambda, dt) {
  return THREE.MathUtils.damp(current, target, lambda, dt)
}

/**
 * ChapterStage: fades + scales its children in/out based on the active
 * scroll phase. Children mount/unmount via opacity so the GPU cost of
 * distant chapters is only a couple of draw calls when hidden.
 */
export function ChapterStage({ center, range = 0.08, position = [0, 0, 0], children }) {
  const group = useRef()
  const state = useRef({ opacity: 0, scale: 0.001 })

  useFrame((_, dt) => {
    if (!group.current) return
    const p = getScrollState().scroll
    const dist = Math.abs(p - center)
    const inside = dist < range * 1.7
    const target = inside ? 1 : 0.0001

    state.current.opacity = damp(state.current.opacity, target, 4.2, dt)
    state.current.scale = damp(state.current.scale, target, 4.2, dt)

    group.current.visible = state.current.opacity > 0.002
    const sc = Math.max(0.0001, state.current.scale)
    group.current.scale.setScalar(sc)
    // broadcast fade to child sprites/meshes that opt in via __visible
    const vis = state.current.opacity
    group.current.traverse((o) => {
      o.userData.__visible = vis
    })
  })

  return (
    <group ref={group} position={position}>
      {children}
    </group>
  )
}

/** Text sprite rendered to canvas — crisp, themeable, no font loading needed. */
export function Label3D({
  text,
  size = 28,
  color = IVORY,
  weight = 600,
  family = "'Inter Tight', sans-serif",
  padding = 10,
  scale = 1,
  position = [0, 0, 0],
  anchor = 'center',
  fade = true,
  glow = null,
}) {
  const sprite = useRef()
  const alpha = useRef(fade ? 0 : 1)

  const { map, aspect } = useMemo(() => {
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')
    const font = `${weight} ${size}px ${family}`
    ctx.font = font
    const lines = Array.isArray(text) ? text : [text]
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width))
    const lh = size * 1.25
    c.width = Math.ceil(w + padding * 2)
    c.height = Math.ceil(lh * lines.length + padding * 2)
    ctx.font = font
    ctx.textBaseline = 'middle'
    if (glow) {
      ctx.shadowColor = glow
      ctx.shadowBlur = size * 0.4
    }
    lines.forEach((l, i) => {
      ctx.fillStyle = color
      const x = anchor === 'left' ? padding : anchor === 'right' ? c.width - padding : c.width / 2
      ctx.fillText(l, x, padding + lh * i + lh / 2)
    })
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return { map: tex, aspect: c.width / c.height }
  }, [text, size, color, weight, family, padding, anchor, glow])

  const height = 0.32 * scale
  useFrame((_, dt) => {
    if (!sprite.current || !fade) return
    alpha.current = damp(alpha.current, sprite.current.userData.__visible ?? 0, 6, dt)
    sprite.current.material.opacity = alpha.current
  })

  return (
    <sprite ref={sprite} position={position} scale={[height * aspect, height, 1]}>
      <spriteMaterial map={map} transparent depthWrite={false} opacity={fade ? 0 : 1} />
    </sprite>
  )
}

/** Coral intelligence line that travels along a curve (draw-on + moving pulse). */
export function IntelLine({ points, color = CORAL, opacity = 0.85, pulse = true, speed = 0.12 }) {
  const { geom, length } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
    const pts = curve.getPoints(80)
    const g = new THREE.BufferGeometry().setFromPoints(pts)
    const len = curve.getLength()
    return { geom: g, length: len }
  }, [points])

  const line = useRef()
  const glowSprite = useRef()
  const drawn = useRef(0)
  const t = useRef(0)

  useFrame((_, dt) => {
    drawn.current = damp(drawn.current, 1, 1.6, dt)
    if (line.current) {
      line.current.geometry.setDrawRange(0, Math.floor(drawn.current * 81))
      const m = line.current.material
      m.opacity = opacity * drawn.current
    }
    if (pulse && glowSprite.current && line.current) {
      t.current = (t.current + dt * speed) % 1
      const pos = line.current.geometry.attributes.position
      const idx = Math.min(80, Math.floor(t.current * 80))
      glowSprite.current.position.fromBufferAttribute(pos, idx)
      const s = getScrollState()
      const flick = 0.55 + Math.abs(Math.sin(performance.now() * 0.004)) * 0.25 + Math.min(1, Math.abs(s.velocity) * 0.004)
      glowSprite.current.material.opacity = 0.9 * flick
    }
  })

  return (
    <group>
      <line ref={line}>
        <primitive object={geom} attach="geometry" />
        <lineBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
      </line>
      {pulse && (
        <sprite ref={glowSprite} scale={[0.22, 0.22, 1]}>
          <spriteMaterial map={glowTexture()} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      )}
    </group>
  )
}

/** Ambient floating particle field that subtly reacts to scroll velocity. */
export function ParticleField({ count = 1200, color = SAGE }) {
  const points = useRef()
  const geom = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 36
      positions[i * 3 + 1] = (Math.random() - 0.5) * 24
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 4
      seeds[i] = Math.random() * Math.PI * 2
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.userData.seeds = seeds
    return g
  }, [count])

  const base = useMemo(() => geom.attributes.position.array.slice(), [geom])

  useFrame(({ clock }) => {
    if (!points.current) return
    const s = getScrollState()
    const t = clock.getElapsedTime()
    const arr = geom.attributes.position.array
    const seeds = geom.userData.seeds
    const drift = s.reduced ? 0 : 1
    for (let i = 0; i < seeds.length; i++) {
      const ix = i * 3
      arr[ix] = base[ix] + Math.sin(t * 0.14 + seeds[i]) * 0.5 * drift
      arr[ix + 1] = base[ix + 1] + Math.cos(t * 0.11 + seeds[i] * 1.3) * 0.5 * drift + s.scroll * 2.2
      arr[ix + 2] = base[ix + 2] + Math.sin(t * 0.09 + seeds[i] * 0.7) * 0.3 * drift
    }
    geom.attributes.position.needsUpdate = true
    points.current.rotation.y = t * 0.005 * drift
  })

  return (
    <points ref={points} geometry={geom}>
      <pointsMaterial
        map={particleTexture()}
        color={color}
        size={0.075}
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}
