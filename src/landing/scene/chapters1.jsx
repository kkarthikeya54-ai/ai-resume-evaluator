import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { getScrollState } from '../utils/scroll'
import { CORAL, SAGE, IVORY, GRAPHITE } from '../utils/colors'
import { glowTexture } from '../utils/textures'
import { Label3D, IntelLine, damp } from './primitives'

const rnd = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/* ------------------------------------------------------------------ */
/*  CHAPTER 3 — CAREER INTELLIGENCE UNIVERSE                            */
/* ------------------------------------------------------------------ */

const CLUSTERS = [
  {
    name: 'Frontend Development', center: [-6.2, 2.1, -1], color: SAGE,
    nodes: ['JavaScript', 'React', 'HTML', 'CSS', 'TypeScript'],
  },
  {
    name: 'Backend & APIs', center: [0, -1.9, -2], color: CORAL,
    nodes: ['Python', 'Node.js', 'SQL', 'REST APIs', 'GraphQL'],
  },
  {
    name: 'Data & Intelligence', center: [6.2, 1.6, -1.5], color: IVORY,
    nodes: ['Machine Learning', 'Data Analysis', 'Data Structures', 'Problem Solving'],
  },
]

export function SkillUniverse() {
  const group = useRef()
  const nodeMeshes = useRef([])

  const layout = useMemo(() => {
    const out = []
    CLUSTERS.forEach((cl, ci) => {
      cl.nodes.forEach((label, ni) => {
        const a = (ni / cl.nodes.length) * Math.PI * 2 + ci * 1.3
        out.push({
          label,
          clusterColor: cl.color,
          center: cl.center,
          offset: [
            Math.cos(a) * 1.75,
            Math.sin(a) * 1.35,
            Math.sin(a * 2 + ci) * 0.7,
          ],
          strength: 0.45 + rnd(ci * 10 + ni) * 0.55,
        })
      })
    })
    return out
  }, [])

  const edges = useMemo(() => {
    const pts = []
    layout.forEach((n) => {
      pts.push([
        n.center[0] + n.offset[0],
        n.center[1] + n.offset[1],
        n.center[2] + n.offset[2],
      ])
    })
    // connect each cluster center to its nodes + a spine between clusters
    const lines = []
    for (let i = 0; i < pts.length; i++) {
      const n = layout[i]
      lines.push([n.center, pts[i]])
    }
    lines.push([CLUSTERS[0].center, CLUSTERS[1].center])
    lines.push([CLUSTERS[1].center, CLUSTERS[2].center])
    return lines
  }, [layout])

  useFrame((state, dt) => {
    const s = getScrollState()
    const t = state.clock.getElapsedTime()
    if (!group.current) return
    group.current.rotation.y = s.reduced ? 0 : Math.sin(t * 0.08) * 0.12 + s.pointer.x * 0.04
    group.current.rotation.x = s.reduced ? 0 : s.pointer.y * 0.03
    nodeMeshes.current.forEach((m, i) => {
      if (!m) return
      const n = layout[i]
      const pulse = 0.16 + n.strength * 0.14 + Math.sin(t * 1.4 + i) * 0.02
      m.scale.setScalar(pulse)
    })
  })

  return (
    <group ref={group}>
      {CLUSTERS.map((cl) => (
        <Label3D key={cl.name} text={cl.name} color={cl.color} size={30} scale={1.35} position={[cl.center[0], cl.center[1] + 1.75, cl.center[2]]} glow={cl.color} />
      ))}
      {edges.map(([a, b], i) => (
        <IntelLine key={i} points={[a, b]} color={i >= layout.length ? CORAL : SAGE} opacity={i >= layout.length ? 0.6 : 0.32} pulse={i >= layout.length} speed={0.1 + i * 0.02} />
      ))}
      {layout.map((n, i) => (
        <group key={n.label} position={[n.center[0] + n.offset[0], n.center[1] + n.offset[1], n.center[2] + n.offset[2]]}>
          <mesh ref={(el) => { nodeMeshes.current[i] = el }}>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={IVORY} emissive={n.clusterColor} emissiveIntensity={0.55} roughness={0.3} metalness={0.25} />
          </mesh>
          <Label3D text={n.label} size={26} scale={0.85} position={[0, -0.5, 0]} />
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  CHAPTER 4 — CAREER READINESS SCORE                                  */
/* ------------------------------------------------------------------ */

export function ScoreObject() {
  const ring1 = useRef()
  const ring2 = useRef()
  const core = useRef()
  const halo = useRef()
  const particles = useRef()
  const assembled = useRef(0)
  const glow = useMemo(() => glowTexture(), [])

  const cloud = useMemo(() => {
    const N = 700
    const arr = new Float32Array(N * 3)
    const target = new Float32Array(N * 3)
    const seed = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      // torus-ish cloud target
      const a = Math.random() * Math.PI * 2
      const r = 1.05 + Math.random() * 0.22
      target[i * 3] = Math.cos(a) * r
      target[i * 3 + 1] = (Math.random() - 0.5) * 0.35
      target[i * 3 + 2] = Math.sin(a) * r
      arr[i * 3] = (Math.random() - 0.5) * 8
      arr[i * 3 + 1] = (Math.random() - 0.5) * 6
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8
      seed[i] = Math.random() * Math.PI * 2
    }
    return { arr, target, seed, N }
  }, [])

  useFrame((state, dt) => {
    const s = getScrollState()
    const t = state.clock.getElapsedTime()
    // assemble entering the score chapter
    assembled.current = damp(assembled.current, THREE.MathUtils.smoothstep(s.scroll, 0.375, 0.42), 3, dt)
    const k = assembled.current

    const { arr, target, seed, N } = cloud
    for (let i = 0; i < N; i++) {
      const ix = i * 3
      const e = k
      arr[ix] += (target[ix] - arr[ix]) * Math.min(1, e * 0.08 + 0.02)
      arr[ix + 1] += (target[ix + 1] - arr[ix + 1]) * Math.min(1, e * 0.08 + 0.02)
      arr[ix + 2] += (target[ix + 2] - arr[ix + 2]) * Math.min(1, e * 0.08 + 0.02)
      // shimmer
      arr[ix + 1] += Math.sin(t * 2 + seed[i]) * 0.002
    }
    particles.current.geometry.attributes.position.needsUpdate = true

    if (ring1.current) ring1.current.rotation.z = t * 0.25
    if (ring2.current) ring2.current.rotation.z = -t * 0.18
    if (core.current) {
      core.current.rotation.y = t * 0.3
      core.current.scale.setScalar(0.9 + Math.sin(t * 1.2) * 0.03)
    }
    if (halo.current) {
      halo.current.quaternion.copy(state.camera.quaternion)
      halo.current.material.opacity = 0.32 * k + Math.sin(t * 2) * 0.04
    }
  })

  return (
    <group>
      {/* particle ring assembling into a torus */}
      <points ref={particles}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={cloud.N} array={cloud.arr} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color={CORAL} size={0.055} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>

      {/* glass rings */}
      <mesh ref={ring1} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.28, 0.035, 16, 80]} />
        <meshStandardMaterial color={CORAL} emissive={CORAL} emissiveIntensity={0.8} roughness={0.25} metalness={0.4} transparent opacity={0.9} />
      </mesh>
      <mesh ref={ring2} rotation={[Math.PI / 2.3, 0.3, 0]}>
        <torusGeometry args={[1.55, 0.02, 16, 80]} />
        <meshStandardMaterial color={SAGE} emissive={SAGE} emissiveIntensity={0.5} roughness={0.3} metalness={0.3} transparent opacity={0.65} />
      </mesh>

      {/* glass core sphere */}
      <mesh ref={core}>
        <icosahedronGeometry args={[0.92, 3]} />
        <meshPhysicalMaterial
          color={CORAL}
          transmission={0.55}
          thickness={1.4}
          roughness={0.16}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.25}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* billboard halo */}
      <sprite ref={halo} scale={[4.6, 4.6, 1]}>
        <spriteMaterial map={glow} color={CORAL} transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  CHAPTER 5 — FIND YOUR GAP                                           */
/* ------------------------------------------------------------------ */

/* Connector heights match the paper texture's skill-dot rows */
const MATCHED = [
  { label: 'React', y: 0.49 },
  { label: 'JavaScript', y: 0.22 },
  { label: 'Python', y: -0.04 },
]
const MISSING = [
  { label: 'System Design', y: -0.7 },
  { label: 'Cloud Computing', y: -1.25 },
  { label: 'Docker', y: -1.8 },
]

const LEFT_X = -5.3
const RIGHT_X = 5.3

/* Gap: ivory resume-style papers (your profile vs your target role) */
function paperPanelTexture(kind) {
  const W = 384
  const H = 560
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  const accent = kind === 'current' ? '#5B8DEF' : '#1D6FF2'
  ctx.fillStyle = '#F8F4ED'
  ctx.fillRect(0, 0, W, H)
  // header band
  const wash = ctx.createLinearGradient(0, 0, 0, 110)
  wash.addColorStop(0, 'rgba(10,31,28,0.05)')
  wash.addColorStop(1, 'rgba(10,31,28,0)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, W, 110)
  ctx.font = '700 30px "Inter Tight", sans-serif'
  ctx.fillStyle = '#13251F'
  ctx.fillText(kind === 'current' ? 'YOUR CURRENT' : 'YOUR TARGET', 30, 58)
  ctx.font = '700 30px "Inter Tight", sans-serif'
  ctx.fillText(kind === 'current' ? 'PROFILE' : 'ROLE', 30, 94)
  ctx.fillStyle = accent
  ctx.fillRect(30, 108, 56, 4)

  // ruled list lines
  ctx.font = '500 22px "Inter Tight", sans-serif'
  const items = kind === 'current'
    ? ['React', 'JavaScript', 'Python']
    : ['React', 'JavaScript', 'Python']
  items.forEach((t, i) => {
    const y = 172 + i * 58
    ctx.fillStyle = accent
    ctx.beginPath()
    ctx.arc(38, y - 8, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#13251F'
    ctx.fillText(t, 58, y)
  })
  if (kind === 'target') {
    // faint "missing" placeholders at the bottom
    ctx.strokeStyle = 'rgba(19,37,31,0.3)'
    ctx.setLineDash([5, 5])
    ;['System Design', 'Cloud Computing', 'Docker'].forEach((t, i) => {
      const y = 352 + i * 58
      ctx.beginPath()
      ctx.arc(38, y - 8, 6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(19,37,31,0.45)'
      ctx.fillText(t, 58, y)
    })
    ctx.setLineDash([])
  }
  ctx.font = '500 15px "Inter Tight", sans-serif'
  ctx.fillStyle = 'rgba(19,37,31,0.4)'
  ctx.fillText(kind === 'current' ? 'parsed from resume.pdf' : 'role template — Full-Stack', 30, H - 30)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function GapStructures() {
  const left = useRef()
  const right = useRef()
  const missingNodes = useRef([])
  const streamRef = useRef()
  const glow = useMemo(() => glowTexture(), [])
  const leftFace = useMemo(() => paperPanelTexture('current'), [])
  const rightFace = useMemo(() => paperPanelTexture('target'), [])

  const streamPts = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 20; i++) {
      const t = i / 20
      pts.push([
        THREE.MathUtils.lerp(LEFT_X + 0.3, RIGHT_X - 0.3, t),
        Math.sin(t * Math.PI) * 0.9 - 0.35,
        Math.sin(t * Math.PI * 2) * 0.35,
      ])
    }
    return pts
  }, [])

  const streamArray = useMemo(() =>
    new Float32Array(streamPts.flatMap((v) => [v[0], v[1], v[2]]))
  , [streamPts])

  useFrame((state, dt) => {
    const s = getScrollState()
    const t = state.clock.getElapsedTime()
    // gap reveal window 0.38 -> 0.465
    const reveal = THREE.MathUtils.smoothstep(s.scroll, 0.48, 0.52)
    const highlight = THREE.MathUtils.smoothstep(s.scroll, 0.5, 0.545)

    if (left.current) {
      left.current.rotation.y = Math.sin(t * 0.4) * 0.16 + 0.18
      left.current.position.y = Math.sin(t * 0.7) * 0.06
    }
    if (right.current) {
      right.current.rotation.y = Math.sin(t * 0.4 + 1) * 0.16 - 0.18
      right.current.position.y = Math.sin(t * 0.7 + 2) * 0.06
    }

    missingNodes.current.forEach((m, i) => {
      if (!m) return
      const mat = m.material
      mat.opacity = 0.18 + highlight * 0.65
      mat.emissiveIntensity = 0.1 + highlight * 0.9
      m.scale.setScalar(0.55 + highlight * 0.45 + Math.sin(t * 2 + i) * 0.04)
    })

    if (streamRef.current) {
      const g = streamRef.current.geometry
      g.setDrawRange(0, Math.floor(reveal * 21))
      streamRef.current.material.opacity = 0.9 * reveal
      const idx = Math.min(20, Math.floor(((t * 0.18) % 1) * 20))
      streamRef.current.userData.pulseIdx = idx
    }
  })

  return (
    <group>
      {/* left — current profile (paper) */}
      <group ref={left} position={[LEFT_X, 0, 0]}>
        <RoundedBox args={[1.7, 2.6, 0.12]} radius={0.06} smoothness={4} castShadow>
          <meshStandardMaterial color="#F8F4ED" roughness={0.85} metalness={0} />
        </RoundedBox>
        <mesh position={[0, 0, 0.065]}>
          <planeGeometry args={[1.64, 2.52]} />
          <meshBasicMaterial map={leftFace} toneMapped={false} />
        </mesh>
      </group>

      {/* right — target role (paper) */}
      <group ref={right} position={[RIGHT_X, 0, 0]}>
        <RoundedBox args={[1.7, 2.6, 0.12]} radius={0.06} smoothness={4} castShadow>
          <meshStandardMaterial color="#F8F4ED" roughness={0.85} metalness={0} />
        </RoundedBox>
        <mesh position={[0, 0, 0.065]}>
          <planeGeometry args={[1.64, 2.52]} />
          <meshBasicMaterial map={rightFace} toneMapped={false} />
        </mesh>
      </group>

      {/* match connectors between the two papers */}
      {MATCHED.map((m) => (
        <line key={m.label}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([LEFT_X + 0.2, m.y, 0.12, RIGHT_X - 0.2, m.y, 0.12])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={SAGE} transparent opacity={0.5} depthWrite={false} />
        </line>
      ))}

      {/* missing nodes drifting between */}
      {MISSING.map((m, i) => (
        <group key={m.label} position={[0, m.y, 0.4 + (i % 2) * 0.4]}>
          <mesh ref={(el) => { missingNodes.current[i] = el }}>
            <icosahedronGeometry args={[0.16, 1]} />
            <meshStandardMaterial color={CORAL} emissive={CORAL} emissiveIntensity={0.1} transparent opacity={0.2} />
          </mesh>
          <Label3D text={m.label} size={22} scale={0.75} position={[0, -0.32, 0]} color={IVORY} />
        </group>
      ))}

      {/* coral difference stream */}
      <line ref={streamRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={21} array={streamArray} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color={CORAL} transparent opacity={0} depthWrite={false} />
      </line>
      <sprite scale={[0.3, 0.3, 1]} position={[0, -0.35, 0.4]}>
        <spriteMaterial map={glow} color={CORAL} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  )
}
/* Marker cleaned up */
