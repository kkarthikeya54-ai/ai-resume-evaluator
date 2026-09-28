import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { getScrollState } from '../utils/scroll'
import { CORAL, SAGE, IVORY, GRAPHITE } from '../utils/colors'
import { glowTexture } from '../utils/textures'
import { Label3D, damp } from './primitives'

const rnd = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/* ------------------------------------------------------------------ */
/*  CHAPTER 6 — CAREER ROADMAP                                          */
/* ------------------------------------------------------------------ */

const MILESTONES = [
  { label: 'START', detail: null, color: SAGE },
  { label: 'Strengthen Fundamentals', detail: 'Floating skill nodes', color: SAGE },
  { label: 'Build Projects', detail: 'Project cards', color: SAGE },
  { label: 'Learn Missing Skills', detail: 'Gap nodes', color: CORAL },
  { label: 'Practice DSA', detail: 'Algorithm patterns', color: SAGE },
  { label: 'Prepare for Interviews', detail: 'Question cards', color: SAGE },
  { label: 'TARGET ROLE', detail: null, color: CORAL },
]

export function RoadmapPath() {
  const path = useRef()
  const markers = useRef([])

  const curve = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 6; i++) {
      const t = i / 6
      pts.push(new THREE.Vector3(
        t * 14 - 7,
        Math.sin(t * Math.PI * 2.2) * 1.5,
        Math.cos(t * Math.PI * 1.6) * 1.1
      ))
    }
    return new THREE.CatmullRomCurve3(pts)
  }, [])

  const tubeGeom = useMemo(() => new THREE.TubeGeometry(curve, 120, 0.035, 8, false), [curve])

  const markerPositions = useMemo(
    () => MILESTONES.map((_, i) => curve.getPoint(i / (MILESTONES.length - 1))),
    [curve]
  )

  useFrame((state, dt) => {
    const s = getScrollState()
    const t = state.clock.getElapsedTime()
    const local = THREE.MathUtils.smoothstep(s.scroll, 0.585, 0.645)
    if (path.current) {
      path.current.material.opacity = 0.25 + local * 0.65
      path.current.material.emissiveIntensity = 0.3 + Math.sin(t * 1.2) * 0.1
    }
    markers.current.forEach((m, i) => {
      if (!m) return
      const shown = local > i / (MILESTONES.length - 1) * 0.92
      const target = shown ? 1 : 0.0001
      m.scale.setScalar(damp(m.scale.x, target, 5, dt))
      m.rotation.y = Math.sin(t * 0.5 + i) * 0.3
      m.position.y = markerPositions[i].y + (i % 2 ? 0.95 : 0.55) + Math.sin(t * 0.9 + i * 1.4) * 0.06
    })
  })

  return (
    <group>
      <mesh ref={path} geometry={tubeGeom}>
        <meshStandardMaterial color={CORAL} emissive={CORAL} emissiveIntensity={0.4} roughness={0.3} metalness={0.3} transparent opacity={0.7} />
      </mesh>
      {MILESTONES.map((m, i) => (
        <group key={m.label} ref={(el) => { markers.current[i] = el }} position={[markerPositions[i].x, markerPositions[i].y + (i % 2 ? 0.95 : 0.55), markerPositions[i].z]} scale={0.0001}>
          <mesh>
            <icosahedronGeometry args={[0.17, 1]} />
            <meshStandardMaterial color={m.color} emissive={m.color} emissiveIntensity={0.75} roughness={0.25} metalness={0.35} />
          </mesh>
          <Label3D text={m.label} size={24} scale={0.9} position={[0, 0.42, 0]} color={IVORY} glow="rgba(232,93,63,0.7)" />
          {m.detail && (
            <Label3D text={m.detail} size={17} scale={0.62} position={[0, -0.36, 0]} color={"rgba(250,248,245,0.55)"} />
          )}
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  CHAPTER 7 — INTERVIEW & PREPARATION ORBIT                           */
/* ------------------------------------------------------------------ */

const PREP_MODULES = [
  { label: 'Interview Prep', detail: 'Mock questions & answers' },
  { label: 'DSA Recommendations', detail: 'Patterns matched to gaps' },
  { label: 'Recommended Content', detail: 'Courses, articles, videos' },
  { label: 'Resume Improvements', detail: 'Wording & structure fixes' },
]

export function PrepOrbit() {
  const orbit = useRef()
  const core = useRef()
  const modules = useRef([])

  useFrame((state, dt) => {
    const s = getScrollState()
    const t = state.clock.getElapsedTime()
    if (!orbit.current) return
    orbit.current.rotation.y = s.reduced ? 0.4 : t * 0.16 + s.pointer.x * 0.1
    if (core.current) {
      core.current.rotation.y = -t * 0.1
      const pulse = 1 + Math.sin(t * 1.4) * 0.025
      core.current.scale.setScalar(pulse)
    }
    // modules briefly expand as the scroll passes through the chapter
    const local = THREE.MathUtils.smoothstep(s.scroll, 0.67, 0.725)
    modules.current.forEach((m, i) => {
      if (!m) return
      const phase = (local * 4 + i) % 4
      const expand = Math.max(0, 1 - Math.abs(phase - 1.5) / 1.5)
      m.userData.expand = expand
      m.scale.setScalar(1 + expand * 0.35)
    })
  })

  return (
    <group ref={orbit}>
      {/* candidate profile core — a paper resume card */}
      <group ref={core}>
        <RoundedBox args={[1.15, 1.5, 0.1]} radius={0.05} smoothness={4}>
          <meshStandardMaterial color="#F8F4ED" roughness={0.85} metalness={0} />
        </RoundedBox>
        <Label3D text="CANDIDATE" size={20} scale={0.72} position={[0, 0.5, 0.08]} color="#13251F" />
        <Label3D text="PROFILE" size={20} scale={0.72} position={[0, 0.28, 0.08]} color="#13251F" />
        <mesh position={[0, -0.15, 0.06]}>
          <circleGeometry args={[0.22, 24]} />
          <meshStandardMaterial color={SAGE} emissive={SAGE} emissiveIntensity={0.5} transparent opacity={0.85} />
        </mesh>
        {[-0.55, -0.75, -0.95].map((y, i) => (
          <mesh key={i} position={[0, y, 0.06]}>
            <planeGeometry args={[0.7 - i * 0.14, 0.05]} />
            <meshStandardMaterial color="#9FB8AE" roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* orbiting preparation modules */}
      {PREP_MODULES.map((mod, i) => {
        const a = (i / PREP_MODULES.length) * Math.PI * 2
        const R = 3.9
        return (
          <group key={mod.label} ref={(el) => { modules.current[i] = el }} position={[Math.cos(a) * R, Math.sin(a * 2) * 1.15, Math.sin(a) * R]}>
            <mesh>
              <octahedronGeometry args={[0.24, 0]} />
              <meshStandardMaterial color={CORAL} emissive={CORAL} emissiveIntensity={0.55} roughness={0.3} metalness={0.3} />
            </mesh>
            <Label3D text={mod.label} size={22} scale={0.86} position={[0, 0.42, 0]} color={IVORY} />
            <Label3D text={mod.detail} size={15} scale={0.62} position={[0, -0.4, 0]} color={"rgba(250,248,245,0.5)"} />
          </group>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  CHAPTER 8 — HR INTELLIGENCE (CANDIDATE RANKING)                     */
/* ------------------------------------------------------------------ */

const CANDIDATES = [
  { rank: '01', score: 96, name: 'Aarav S.', role: 'Full-Stack Developer',
    skills: ['React · Node.js · TypeScript', 'REST · PostgreSQL'],
    exp: ['SDE Intern — Finlabs', 'Open-source contributor'], edu: 'B.Tech, Computer Science' },
  { rank: '02', score: 92, name: 'Meera K.', role: 'Data Scientist',
    skills: ['Python · PyTorch · SQL', 'Pandas · scikit-learn'],
    exp: ['ML Intern — DataX', 'Kaggle Expert'], edu: 'B.Tech, Information Tech' },
  { rank: '03', score: 87, name: 'Dev P.', role: 'Backend Engineer',
    skills: ['Python · Node.js · Redis', 'Docker · AWS'],
    exp: ['3 production projects', 'API platform builder'], edu: 'B.Tech, Computer Science' },
  { rank: '04', score: 81, name: 'Isha R.', role: 'Frontend Engineer',
    skills: ['React · JavaScript · CSS', 'Figma · Motion design'],
    exp: ['5 shipped web apps', 'Design-systems fan'], edu: 'BCA, Visual Computing' },
]

/* A real-looking resume face, unique per candidate — ink on ivory paper. */
function resumeFaceTexture(cand) {
  const W = 512
  const H = 684
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  const ink = '#13251F'

  // paper
  ctx.fillStyle = '#F8F4ED'
  ctx.fillRect(0, 0, W, H)
  const wash = ctx.createLinearGradient(0, 0, 0, 130)
  wash.addColorStop(0, 'rgba(10,31,28,0.06)')
  wash.addColorStop(1, 'rgba(10,31,28,0)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, W, 130)

  // header
  ctx.fillStyle = ink
  ctx.font = '700 40px "Inter Tight", sans-serif'
  ctx.fillText(cand.name, 38, 76)
  ctx.font = '600 21px "Inter Tight", sans-serif'
  ctx.fillStyle = '#1D6FF2'
  ctx.fillText(cand.role.toUpperCase(), 40, 112)
  ctx.fillRect(40, 126, 64, 4)

  const section = (title, y, lines) => {
    ctx.font = '700 16px "Inter Tight", sans-serif'
    ctx.fillStyle = 'rgba(19,37,31,0.5)'
    ctx.fillText(title, 40, y)
    ctx.font = '500 23px "Inter Tight", sans-serif'
    ctx.fillStyle = ink
    lines.forEach((l, i) => ctx.fillText(l, 40, y + 36 + i * 32))
  }

  let y = 184
  section('SKILLS', y, cand.skills)
  y += 36 + cand.skills.length * 32 + 36
  section('EXPERIENCE', y, cand.exp)
  y += 36 + cand.exp.length * 32 + 36
  section('EDUCATION', y, [cand.edu])

  ctx.font = '500 16px "Inter Tight", sans-serif'
  ctx.fillStyle = 'rgba(19,37,31,0.4)'
  ctx.fillText('resume.pdf — parsed by HireTire', 40, H - 36)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/* Floating rank / match annotations that appear once ranking locks in. */
function makeAnnot(text, color, px = 44, weight = 700) {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  const font = `${weight} ${px}px "Inter Tight", sans-serif`
  ctx.font = font
  c.width = Math.ceil(ctx.measureText(text).width) + 20
  c.height = px + 22
  ctx.font = font
  ctx.fillStyle = color
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 10
  ctx.fillText(text, 10, px + 4)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return { map: tex, aspect: c.width / c.height }
}

const SCATTER = [
  [-7.2, 2.3, -2.5], [7.0, 1.9, -3.5], [-6.6, -2.2, -2], [7.4, -2.4, -3],
]
const RANKED = [
  [-4.4, 1.55, 0.6], [-1.5, 0.55, 0.2], [1.5, -0.55, -0.2], [4.4, -1.6, -0.6],
]

export function HRCandidates() {
  const cards = useRef([])
  const annots = useRef([])
  const slabMats = useRef([])

  const faces = useMemo(() => CANDIDATES.map(resumeFaceTexture), [])
  const rankAnnots = useMemo(() => CANDIDATES.map((c) => makeAnnot(c.rank, '#FF8163')), [])
  const scoreAnnots = useMemo(() => CANDIDATES.map((c) => makeAnnot(c.score + '%', '#9FD0BF', 40, 700)), [])

  useFrame((state, dt) => {
    const s = getScrollState()
    const t = state.clock.getElapsedTime()
    // transform window: 0.665 -> 0.78 (scattered resumes -> ranked profiles)
    const k = THREE.MathUtils.smoothstep(s.scroll, 0.745, 0.83)
    const aK = THREE.MathUtils.smoothstep(k, 0.55, 0.95)
    annots.current.forEach((sp) => {
      if (sp) sp.material.opacity = aK * 0.96
    })
    slabMats.current.forEach((m) => {
      if (m) m.opacity = 0.18 + aK * 0.74
    })
    cards.current.forEach((c, i) => {
      if (!c) return
      const from = SCATTER[i]
      const to = RANKED[i]
      const e = THREE.MathUtils.smoothstep(k, i * 0.12, 0.85 + i * 0.05)
      c.position.set(
        THREE.MathUtils.lerp(from[0], to[0], e),
        THREE.MathUtils.lerp(from[1], to[1], e) + Math.sin(t * 0.8 + i * 1.3) * 0.05,
        THREE.MathUtils.lerp(from[2], to[2], e)
      )
      c.rotation.y = THREE.MathUtils.lerp(Math.sin(t * 0.3 + i) * 0.4, 0.12 - i * 0.06, e)
      c.rotation.z = THREE.MathUtils.lerp((rnd(i) - 0.5) * 0.5, 0, e)
    })
  })

  return (
    <group>
      {CANDIDATES.map((c, i) => {
        const rk = rankAnnots[i]
        const sc = scoreAnnots[i]
        return (
          <group key={c.rank} ref={(el) => { cards.current[i] = el }} position={SCATTER[i]}>
            {/* graphite scoring slab — slides in behind once ranking starts */}
            <RoundedBox args={[1.64, 2.14, 0.1]} radius={0.05} smoothness={4} position={[0.07, -0.07, -0.15]}>
              <meshStandardMaterial
                ref={(el) => { slabMats.current[i] = el }}
                color={GRAPHITE} roughness={0.4} metalness={0.38} transparent opacity={0.18}
              />
            </RoundedBox>
            {/* the resume itself — ivory paper, unique per candidate */}
            <mesh castShadow>
              <boxGeometry args={[1.5, 2.0, 0.03]} />
              <meshStandardMaterial color="#F8F4ED" roughness={0.85} metalness={0} />
            </mesh>
            <mesh position={[0, 0, 0.018]}>
              <planeGeometry args={[1.46, 1.96]} />
              <meshBasicMaterial map={faces[i]} toneMapped={false} />
            </mesh>
            {/* rank + match annotations, revealed during ranking */}
            <sprite
              ref={(el) => { annots.current[i * 2] = el }}
              position={[-1.06, 0.92, 0.25]}
              scale={[0.34 * rk.aspect, 0.34, 1]}
            >
              <spriteMaterial map={rk.map} transparent opacity={0} depthWrite={false} />
            </sprite>
            <sprite
              ref={(el) => { annots.current[i * 2 + 1] = el }}
              position={[1.08, -0.9, 0.25]}
              scale={[0.3 * sc.aspect, 0.3, 1]}
            >
              <spriteMaterial map={sc.map} transparent opacity={0} depthWrite={false} />
            </sprite>
          </group>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  CHAPTER 9 — AI HR CHAT                                              */
/* ------------------------------------------------------------------ */

const CHAT_Q1 = ['Which candidate has the', 'strongest backend experience?']
const CHAT_A1 = ['Dev P. — Python + Node.js', 'with 3 production projects.']

export function AIHRChat() {
  const qPanel = useRef()
  const aPanel = useRef()
  const comp1 = useRef()
  const comp2 = useRef()
  const compGroup = useRef()

  useFrame((state, dt) => {
    const s = getScrollState()
    const t = state.clock.getElapsedTime()
    const reveal = THREE.MathUtils.smoothstep(s.scroll, 0.845, 0.9)
    const compare = THREE.MathUtils.smoothstep(s.scroll, 0.89, 0.925)

    if (qPanel.current) {
      qPanel.current.rotation.y = Math.sin(t * 0.4) * 0.06
      qPanel.current.position.y = 1.65 + Math.sin(t * 0.8) * 0.04
    }
    if (aPanel.current) {
      // answer slides in after question
      const e = THREE.MathUtils.smoothstep(reveal, 0.35, 1)
      aPanel.current.position.set(-2.4 + e * 0.2, -1.55, 0.5)
      aPanel.current.scale.setScalar(Math.max(0.0001, e))
    }
    if (compGroup.current) {
      compGroup.current.visible = compare > 0.01
      compGroup.current.scale.setScalar(Math.max(0.0001, compare))
    }
    ;[comp1, comp2].forEach((ref, side) => {
      if (!ref.current) return
      ref.current.position.x = (side === 0 ? -1 : 1) * 2.6
      ref.current.position.y = -1.55 + Math.sin(t * 0.7 + side * 2) * 0.05
      ref.current.rotation.y = (side === 0 ? 0.28 : -0.28) * (1 - compare * 0.4)
    })
  })

  return (
    <group>
      {/* question panel */}
      <group ref={qPanel} position={[0, 1.65, 0]}>
        <RoundedBox args={[4.6, 1.1, 0.09]} radius={0.09} smoothness={4}>
          <meshStandardMaterial color={GRAPHITE} roughness={0.35} metalness={0.45} />
        </RoundedBox>
        <Label3D text={CHAT_Q1} size={24} scale={0.92} position={[0, 0.05, 0.08]} color={IVORY} />
        <mesh position={[-2.05, 0, 0.06]}>
          <circleGeometry args={[0.16, 24]} />
          <meshStandardMaterial color={CORAL} emissive={CORAL} emissiveIntensity={1.1} />
        </mesh>
      </group>

      {/* AI answer panel */}
      <group ref={aPanel} position={[-2.4, -1.15, 0.5]}>
        <RoundedBox args={[3.3, 0.95, 0.09]} radius={0.09} smoothness={4}>
          <meshStandardMaterial color={"#123A33"} roughness={0.4} metalness={0.3} emissive={SAGE} emissiveIntensity={0.08} />
        </RoundedBox>
        <Label3D text={CHAT_A1} size={21} scale={0.85} position={[0, 0.02, 0.08]} color={SAGE} glow="rgba(127,169,155,0.6)" />
      </group>

      {/* comparison — two candidate cards move forward */}
      <group ref={compGroup} scale={0.0001}>
        <group ref={comp1} position={[-2.6, -1.55, 0.6]}>
          <RoundedBox args={[1.6, 1.9, 0.1]} radius={0.06} smoothness={4}>
            <meshStandardMaterial color={GRAPHITE} roughness={0.4} metalness={0.4} />
          </RoundedBox>
          <Label3D text="CANDIDATE 01" size={20} scale={0.78} position={[0, 0.6, 0.08]} color={CORAL} />
          <Label3D text={['Python  Node.js', 'REST APIs  SQL']} size={18} scale={0.7} position={[0, -0.05, 0.08]} color={"rgba(250,248,245,0.8)"} />
          <Label3D text="96% MATCH" size={24} weight={700} scale={0.8} position={[0, -0.65, 0.08]} color={SAGE} />
        </group>
        <group ref={comp2} position={[2.6, -1.55, 0.6]}>
          <RoundedBox args={[1.6, 1.9, 0.1]} radius={0.06} smoothness={4}>
            <meshStandardMaterial color={GRAPHITE} roughness={0.4} metalness={0.4} />
          </RoundedBox>
          <Label3D text="CANDIDATE 02" size={20} scale={0.78} position={[0, 0.6, 0.08]} color={CORAL} />
          <Label3D text={['TypeScript  React', 'GraphQL  AWS']} size={18} scale={0.7} position={[0, -0.05, 0.08]} color={"rgba(250,248,245,0.8)"} />
          <Label3D text="92% MATCH" size={24} weight={700} scale={0.8} position={[0, -0.65, 0.08]} color={SAGE} />
        </group>
        <Label3D text="COMPARE 01 vs 02" size={26} weight={700} scale={1} position={[0, -2.6, 0.6]} color={CORAL} glow="rgba(232,93,63,0.7)" />
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  CHAPTER 10 — FINAL COLLAPSE + LOGO KNOT                             */
/* ------------------------------------------------------------------ */

function logoCurve() {
  // abstract continuous knot: figure-eight path weaving over itself
  const pts = []
  for (let i = 0; i <= 100; i++) {
    const t = i / 100
    const a = t * Math.PI * 2
    // lemniscate-ish weave
    const x = Math.sin(a) * 1.05
    const y = Math.sin(a * 2) * 0.55
    const z = Math.cos(a * 2) * 0.35
    pts.push(new THREE.Vector3(x, y, z))
  }
  return new THREE.CatmullRomCurve3(pts, true)
}

export function FinalCollapse() {
  const collapsing = useRef()
  const knot = useRef()
  const orbiters = useRef([])
  const drawn = useRef(0)

  const tubeGeom = useMemo(() => new THREE.TubeGeometry(logoCurve(), 160, 0.055, 8, true), [])
  const knotArray = useMemo(() => {
    const curve = logoCurve()
    const arr = new Float32Array(160 * 3)
    for (let i = 0; i < 160; i++) {
      const p = curve.getPoint(i / 160)
      arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z
    }
    return arr
  }, [])

  // everything the user has seen, orbiting inward
  const orbitItems = useMemo(() => (
    Array.from({ length: 26 }, (_, i) => ({
      kind: i % 3,
      startR: 4.5 + rnd(i) * 3.5,
      a: rnd(i + 50) * Math.PI * 2,
      y: (rnd(i + 90) - 0.5) * 4.8,
      speed: 0.2 + rnd(i + 30) * 0.3,
    }))
  ), [])

  useFrame((state, dt) => {
    const s = getScrollState()
    const t = state.clock.getElapsedTime()
    // finale completes by story 0.95 — the story itself is compressed to end
    // just before the showcase below the track enters the viewport (the knee
    // is measured at runtime in utils/scroll.js), so the knot always gets
    // the screen to itself before the interface arrives
    const collapse = THREE.MathUtils.smoothstep(s.scroll, 0.93, 0.94)
    const logo = THREE.MathUtils.smoothstep(s.scroll, 0.945, 0.95)

    // orbiters spiral inward
    orbiters.current.forEach((m, i) => {
      if (!m) return
      const o = orbitItems[i]
      const e = collapse * (0.55 + o.speed)
      const r = o.startR * (1 - Math.min(1, e)) + 0.15
      const a = o.a + t * o.speed * (0.4 + e * 1.6)
      m.position.set(Math.cos(a) * r, o.y * (1 - e) + Math.sin(a * 2) * 0.2, Math.sin(a) * r)
      m.rotation.x = t * (0.6 + o.speed)
      m.rotation.y = t * (0.4 + o.speed)
      const mat = m.material
      mat.opacity = 0.85 * collapse
    })

    // document rotates + fades out into the knot
    if (collapsing.current) {
      collapsing.current.rotation.y = t * 0.5 * (collapse > 0 ? 1 : 0) + collapse * Math.PI * 2
      collapsing.current.rotation.x = collapse * 0.6
      collapsing.current.scale.setScalar(Math.max(0.0001, 1 - logo * 0.9))
      collapsing.current.visible = logo < 0.98
    }

    // knot draws on
    drawn.current = damp(drawn.current, logo, 2.4, dt)
    if (knot.current) {
      knot.current.geometry.setDrawRange(0, Math.floor(drawn.current * 160))
      knot.current.material.opacity = drawn.current * 0.95
      knot.current.rotation.y = t * 0.35
      knot.current.rotation.x = Math.sin(t * 0.4) * 0.12
    }
  })

  return (
    <group>
      {/* collapsing debris — skills, cards, milestones returning to center */}
      {orbitItems.map((o, i) => (
        <mesh key={i} ref={(el) => { orbiters.current[i] = el }}>
          {o.kind === 0 && <octahedronGeometry args={[0.09, 0]} />}
          {o.kind === 1 && <boxGeometry args={[0.16, 0.2, 0.02]} />}
          {o.kind === 2 && <icosahedronGeometry args={[0.08, 0]} />}
          <meshStandardMaterial
            color={o.kind === 0 ? CORAL : o.kind === 1 ? IVORY : IVORY}
            emissive={o.kind === 0 ? CORAL : o.kind === 1 ? IVORY : SAGE}
            emissiveIntensity={o.kind === 0 ? 0.6 : 0.22}
            transparent
            opacity={0}
          />
        </mesh>
      ))}

      {/* the document returning to center */}
      <mesh ref={collapsing} castShadow>
        <boxGeometry args={[1.9, 2.55, 0.05]} />
        <meshStandardMaterial color={IVORY} roughness={0.82} metalness={0} transparent opacity={1} />
      </mesh>

      {/* HireTire podium logo */}
      <line ref={knot}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={160}
            array={knotArray}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={CORAL} transparent opacity={0} depthWrite={false} linewidth={2} />
      </line>
      <sprite scale={[3.2, 3.2, 1]}>
        <spriteMaterial map={glowTexture()} color={CORAL} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  )
}
