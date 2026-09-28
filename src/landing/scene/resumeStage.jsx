import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getScrollState } from '../utils/scroll'
import { CORAL, IVORY } from '../utils/colors'
import { paperTexture, glowTexture } from '../utils/textures'

const EXTRACTED = [
  'Python', 'Machine Learning', 'React', 'JavaScript',
  'Data Structures', 'Problem Solving', 'Education', 'Experience',
]

/* Content shown on each fan sheet — real sections of the parsed resume */
const PLATE_CONTENT = [
  { title: 'SKILLS', rows: ['Python · ML', 'React · JavaScript', 'SQL · Pandas', 'Data Structures'] },
  { title: 'EDUCATION', rows: ['B.Tech, Computer Science', '2021 — 2025', 'CGPA 8.6 / 10'] },
  { title: 'EXPERIENCE', rows: ['SDE Intern — Finlabs', 'ML Intern — DataX', 'Open-source contributor'] },
  { title: 'PROJECTS', rows: ['Career Intelligence App', 'Vision Pipeline', 'Realtime Dashboard'] },
  { title: 'ACHIEVEMENTS', rows: ['Hackathon Winner 2024', 'Top 1% — DSA ranks', 'Published 2 papers'] },
  { title: 'KEYWORDS', rows: ['ownership', 'leadership', 'cloud-native', 'problem solving'] },
]

const rnd = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function makeLabelTexture(text) {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  const font = '600 40px "Inter Tight", sans-serif'
  ctx.font = font
  const w = Math.ceil(ctx.measureText(text).width)
  c.width = w + 24
  c.height = 64
  ctx.font = font
  ctx.fillStyle = '#F7FAFF'
  ctx.shadowColor = 'rgba(232,93,63,0.9)'
  ctx.shadowBlur = 14
  ctx.fillText(text, 12, 44)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function plateFaceTexture(content) {
  const W = 512
  const H = 688
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')

  // paper ground — ivory, like the resume itself
  ctx.fillStyle = '#F6F2E9'
  ctx.fillRect(0, 0, W, H)
  // soft top wash for depth
  const wash = ctx.createLinearGradient(0, 0, 0, 140)
  wash.addColorStop(0, 'rgba(10,31,28,0.07)')
  wash.addColorStop(1, 'rgba(10,31,28,0)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, W, 140)

  // section title
  ctx.font = '700 36px "Inter Tight", sans-serif'
  ctx.fillStyle = '#13251F'
  ctx.fillText(content.title, 42, 78)
  ctx.fillStyle = '#1D6FF2'
  ctx.fillRect(42, 98, 56, 5)

  // rows with sage bullets — dark ink on paper
  ctx.font = '500 28px "Inter Tight", sans-serif'
  content.rows.forEach((row, i) => {
    const y = 178 + i * 66
    ctx.fillStyle = '#5B8DEF'
    ctx.beginPath()
    ctx.arc(54, y - 10, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#13251F'
    ctx.fillText(row, 80, y)
  })

  ctx.font = '500 20px "Inter Tight", sans-serif'
  ctx.fillStyle = 'rgba(19,37,31,0.42)'
  ctx.fillText('— extracted from resume.pdf', 42, H - 44)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/* Precomputed fan orbits: angle, depth, and delay so the sheets peel off
   one after another instead of all at once */
const SHEETS = PLATE_CONTENT.map((content, i) => {
  // spread around a wide arc that keeps the right side (text panel) clear
  const angles = [-38, -78, -118, -158, -198, -262]
  const a = (angles[i] * Math.PI) / 180
  return {
    content,
    i,
    ax: Math.cos(a),
    az: Math.sin(a),
    delay: i * 0.55,       // peel stagger
    lift: 0.5 + rnd(i + 3) * 0.5,
    tilt: (i % 2 ? 1 : -1) * (0.16 + rnd(i + 7) * 0.12),
  }
})

export function ResumeDoc() {
  const root = useRef()
  const sheet = useRef()
  const sheets = useRef([])
  const streamLine = useRef()
  const streamPulse = useRef()
  const labelSprites = useRef([])

  const paper = useMemo(() => paperTexture(), [])
  const glow = useMemo(() => glowTexture(), [])
  const faces = useMemo(() => PLATE_CONTENT.map(plateFaceTexture), [])

  // Labels fan on an ellipse that leaves the right sector open — that's
  // where the parsing text panel lives, so nothing lands under the copy.
  const LABEL_ANGLES = [55, 90, 126, 162, 198, 234, 270, 306]
  const labels = useMemo(() => EXTRACTED.map((text, i) => {
    const a = (LABEL_ANGLES[i] * Math.PI) / 180
    return {
      text,
      pos: [
        Math.cos(a) * 3.4,
        Math.sin(a) * 2.05 + 0.1,
        (rnd(i + 80) - 0.5) * 1.2,
      ],
      map: makeLabelTexture(text),
      aspect: makeLabelTexture(text).image.width / 64,
    }
  }), [])

  const streamPts = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 24; i++) {
      const t = i / 24
      const a = t * Math.PI * 2
      pts.push([
        Math.cos(a) * 1.15 + (rnd(i) - 0.5) * 0.2,
        Math.sin(a * 2) * 1.5 + (rnd(i + 40) - 0.5) * 0.3,
        Math.sin(a) * 0.6,
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
    const p = s.scroll
    const reduced = s.reduced

    const floatY = reduced ? 0 : Math.sin(t * 0.6) * 0.1
    const floatR = reduced ? 0 : Math.sin(t * 0.4) * 0.05

    // hero slide right, then drift back left during parsing so the right
    // text panel never sits on top of the document
    const heroSlide = THREE.MathUtils.smoothstep(p, 0.02, 0.1)
    const parseReturn = THREE.MathUtils.smoothstep(p, 0.125, 0.19)
    const aspect = state.size ? state.size.width / state.size.height : 1.6
    const slideMax = aspect >= 1.4 ? 3.0 : aspect >= 0.9 ? 1.6 : 0
    const docX = heroSlide * slideMax * (1 - parseReturn * 0.85)

    // fan opens 0.135–0.21 (staggered peel), holds fully open through the
    // parsing chapter, folds back only as the document exits
    const open = THREE.MathUtils.smoothstep(p, 0.135, 0.21)
    const close = 1 - THREE.MathUtils.smoothstep(p, 0.3, 0.385)
    const masterFade = 1 - THREE.MathUtils.smoothstep(p, 0.3, 0.4)
    root.current.visible = masterFade > 0.015

    root.current.position.set(docX, floatY, 0)
    root.current.rotation.y = floatR + open * 0.4 + p * 0.25
    root.current.rotation.x = floatR * 0.5 - open * 0.1

    // sheets peel off one by one — dark ink labels are baked into their
    // ivory faces, so every sheet is readable the moment it appears
    SHEETS.forEach((o, i) => {
      const g = sheets.current[i]
      if (!g) return
      const local = THREE.MathUtils.clamp(open * (1 + o.delay) - o.delay, 0, 1)
      const e = local * local * (3 - 2 * local)
      const fan = e * (2.1 + o.i * 0.22)
      g.position.set(o.ax * fan, o.lift * (e - 0.35) * 1.2, o.az * fan - e * 0.7)
      g.rotation.y = o.ax * e * 0.5 + o.tilt * e
      g.rotation.z = o.az * e * 0.22
      const mats = g.userData.mats
      if (mats) {
        mats.body.opacity = e
        mats.face.opacity = e
      }
      g.visible = e > 0.01
    })

    // extracted labels orbit during the reveal window (held through the
    // parsing chapter, released as the document exits)
    const extractVis = THREE.MathUtils.smoothstep(p, 0.075, 0.13) *
      (1 - THREE.MathUtils.smoothstep(p, 0.28, 0.35))
    const grow = 1 + Math.min(p, 0.15) * 0.9
    labelSprites.current.forEach((spr, i) => {
      if (!spr) return
      const o = labels[i]
      const sway = reduced ? 0 : Math.sin(t * 0.8 + i * 1.7) * 0.08
      spr.position.set(
        o.pos[0] * grow,
        o.pos[1] * grow + sway,
        o.pos[2]
      )
      spr.material.opacity = extractVis * 0.95
    })

    // intelligence stream: draw-on window ends with the parsing chapter
    const streamVis = THREE.MathUtils.clamp(
      THREE.MathUtils.smoothstep(p, 0.04, 0.09) * (1 - THREE.MathUtils.smoothstep(p, 0.3, 0.42)),
      0, 1
    )
    streamLine.current.geometry.setDrawRange(0, Math.floor(streamVis * 25))
    streamLine.current.material.opacity = 0.85 * streamVis
    streamLine.current.position.x = docX
    const pulseIdx = Math.min(24, Math.floor(((t * 0.14) % 1) * 24))
    streamPulse.current.position.fromBufferAttribute(
      streamLine.current.geometry.attributes.position, pulseIdx
    )
    streamPulse.current.position.x += docX
    streamPulse.current.material.opacity = streamVis * (0.55 + Math.abs(Math.sin(t * 3)) * 0.3)

    sheet.current.material.opacity = masterFade
  })

  return (
    <group ref={root}>
      {/* paper sheet */}
      <mesh ref={sheet} castShadow>
        <boxGeometry args={[1.9, 2.55, 0.05]} />
        <meshStandardMaterial
          map={paper}
          color={IVORY}
          roughness={0.82}
          metalness={0}
          transparent
          opacity={1}
        />
      </mesh>

      {/* six ivory sheets that peel off one at a time — each carries its
          extracted section printed in ink on the paper face */}
      {SHEETS.map((o, i) => (
        <group
          key={o.content.title}
          ref={(el) => {
            sheets.current[i] = el
            if (el) el.userData.mats = { body: el.children[0]?.material, face: el.children[1]?.material }
          }}
          visible={false}
        >
          <mesh>
            <boxGeometry args={[1.3, 1.78, 0.02]} />
            <meshStandardMaterial color="#F6F2E9" roughness={0.85} metalness={0} transparent opacity={0} />
          </mesh>
          <mesh position={[0, 0, 0.016]}>
            <planeGeometry args={[1.27, 1.74]} />
            <meshBasicMaterial map={faces[i]} transparent opacity={0} toneMapped={false} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* coral intelligence stream + travelling pulse */}
      <line ref={streamLine}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={25} array={streamArray} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color={CORAL} transparent opacity={0} depthWrite={false} />
      </line>
      <sprite ref={streamPulse} scale={[0.26, 0.26, 1]}>
        <spriteMaterial map={glow} color={CORAL} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>

      {/* extracted information labels */}
      {labels.map((o, i) => (
        <sprite
          key={o.text}
          ref={(el) => { labelSprites.current[i] = el }}
          scale={[o.aspect * 0.36, 0.36, 1]}
        >
          <spriteMaterial map={o.map} transparent opacity={0} depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}
