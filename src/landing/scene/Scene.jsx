import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { getScrollState } from '../utils/scroll'
import { detectEnvironment } from '../utils/environment'
import { PINE, CORAL, SAGE, IVORY } from '../utils/colors'
import { gridTexture } from '../utils/textures'
import { sampleCamera } from './cameraRig'
import { ParticleField, ChapterStage } from './primitives'
import { ResumeDoc } from './resumeStage'
import { SkillUniverse, ScoreObject, GapStructures } from './chapters1'
import { RoadmapPath, PrepOrbit, HRCandidates, AIHRChat, FinalCollapse } from './chapters2'

/* Camera driver — position/lookAt/fov come from the scroll rig every frame */
function CameraRig() {
  const { camera } = useThree()
  const pos = useRef(new THREE.Vector3(0, 0.1, 6.4))
  const look = useRef(new THREE.Vector3(0, 0.05, 0))
  const tmpPos = useRef(new THREE.Vector3())
  const tmpLook = useRef(new THREE.Vector3())

  useFrame((_, dt) => {
    const s = getScrollState()
    const fov = sampleCamera(s.scroll, tmpPos.current, tmpLook.current)
    // pointer parallax — subtle, never fights the scroll choreography
    pos.current.set(
      tmpPos.current.x + s.pointer.x * 0.22,
      tmpPos.current.y + s.pointer.y * 0.16,
      tmpPos.current.z
    )
    look.current.copy(tmpLook.current)
    camera.position.lerp(pos.current, Math.min(1, dt * 6))
    camera.lookAt(look.current)
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov += (fov - camera.fov) * Math.min(1, dt * 5)
      camera.updateProjectionMatrix()
    }
  })
  return null
}

/*
 * Chapter — the single mount point for every story chapter. Owns, in one
 * place: fade/scale gating (ChapterStage), frustum fitting so each layout
 * fills the screen at its depth (read straight off the live camera), and
 * the shift away from the overlay text zone.
 */
function Chapter({ center, range, z = 0, authoredWidth = 12, shift = [0, 0], children }) {
  const fit = useRef()
  const { size } = useThree()

  useFrame(() => {
    if (!fit.current) return
    const cam = sampleCamera.lastZ ?? 11
    const aspect = size.width / size.height
    const dist = Math.max(2, cam - z)
    const widthAtZ = 2 * dist * Math.tan(THREE.MathUtils.degToRad(46) / 2) * aspect
    const target = Math.max(0.42, Math.min(1, (widthAtZ * 0.96) / authoredWidth))
    fit.current.scale.setScalar(THREE.MathUtils.damp(fit.current.scale.x, target, 5, 1 / 60))
    fit.current.position.x = THREE.MathUtils.damp(fit.current.position.x, shift[0], 5, 1 / 60)
    fit.current.position.y = THREE.MathUtils.damp(fit.current.position.y, shift[1], 5, 1 / 60)
  })

  return (
    <ChapterStage center={center} range={range}>
      <group ref={fit}>
        {children}
      </group>
    </ChapterStage>
  )
}

/* Publish the live camera depth for the chapter fitter (one tiny global) */
function CameraDepth() {
  useFrame(({ camera }) => { sampleCamera.lastZ = camera.position.z })
  return null
}

/* Faint infinite grid floor, scrolling subtly with progress */
function GridFloor() {
  const mesh = useRef()
  const tex = useMemo(() => gridTexture(), [])
  useFrame((state) => {
    if (!mesh.current) return
    const s = getScrollState()
    tex.offset.y = -s.scroll * 6
    tex.offset.x = state.clock.getElapsedTime() * 0.008
    mesh.current.material.opacity = 0.05 + Math.sin(s.scroll * Math.PI) * 0.035
  })
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.4, 0]}>
      <planeGeometry args={[60, 80]} />
      <meshBasicMaterial map={tex} transparent opacity={0.06} depthWrite={false} color={SAGE} />
    </mesh>
  )
}

/* Soft volumetric-ish light beams (cheap: additive planes) */
function LightBeams() {
  const group = useRef()
  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.getElapsedTime()
    group.current.children.forEach((beam, i) => {
      beam.material.opacity = 0.028 + Math.sin(t * 0.3 + i * 2) * 0.012
      beam.rotation.z = Math.sin(t * 0.1 + i) * 0.05
    })
  })
  return (
    <group ref={group}>
      {[-4, 0, 4].map((x, i) => (
        <mesh key={i} position={[x, 2, -6]} rotation={[0, 0, (i - 1) * 0.16]}>
          <planeGeometry args={[2.2, 16]} />
          <meshBasicMaterial color={i === 1 ? CORAL : SAGE} transparent opacity={0.03} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

/*
 * The journey. Chapter centers are locked to the overlay phase bounds in
 * utils/scroll.js — phase N's text is always paired with chapter N's world.
 */
export default function Scene() {
  const env = detectEnvironment()
  return (
    <>
      <color attach="background" args={[PINE]} />
      <fog attach="fog" args={[PINE, 10, 30]} />

      <CameraRig />
      <CameraDepth />
      <ParticleField count={env.particleCount} />
      <GridFloor />
      <LightBeams />

      {/* cinematic three-point lighting + coral/sage accents */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 4]} intensity={1.1} color={IVORY} />
      <pointLight position={[-6, 2, 3]} intensity={14} color={CORAL} distance={20} decay={2} />
      <pointLight position={[6, -3, 2]} intensity={8} color={SAGE} distance={18} decay={2} />
      <pointLight position={[0, 5, -6]} intensity={10} color={IVORY} distance={22} decay={2} />

      {/* the persistent resume document (prologue → parsing) */}
      <ResumeDoc />

      <Chapter center={0.3275} range={0.036} z={-1.5} authoredWidth={13.4} shift={[0, -1.15]}>
        <SkillUniverse />
      </Chapter>

      <Chapter center={0.4225} range={0.032} authoredWidth={8.5} shift={[3.0, -0.5]}>
        <ScoreObject />
      </Chapter>

      <Chapter center={0.525} range={0.042} authoredWidth={12.6} shift={[0, -0.5]}>
        <GapStructures />
      </Chapter>

      <Chapter center={0.625} range={0.03} authoredWidth={13.5} shift={[0, -0.75]}>
        <RoadmapPath />
      </Chapter>

      <Chapter center={0.705} range={0.028} authoredWidth={9.6} shift={[0, -1.0]}>
        <PrepOrbit />
      </Chapter>

      <Chapter center={0.785} range={0.028} z={-2} authoredWidth={14.2} shift={[0, -0.85]}>
        <HRCandidates />
      </Chapter>

      <Chapter center={0.8775} range={0.036} authoredWidth={9.6} shift={[0, -0.65]}>
        <AIHRChat />
      </Chapter>

      <Chapter center={0.965} range={0.03} authoredWidth={8} shift={[0, -0.3]}>
        <FinalCollapse />
      </Chapter>

      {/* studio reflections for glass materials */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={2} position={[0, 5, -9]} scale={[12, 4, 1]} color={IVORY} />
        <Lightformer intensity={1.4} position={[-6, 1, 2]} scale={[3, 6, 1]} color={CORAL} />
        <Lightformer intensity={1.1} position={[6, -1, 2]} scale={[3, 6, 1]} color={SAGE} />
      </Environment>
    </>
  )
}

export function SceneCanvas() {
  const env = detectEnvironment()
  return (
    <Canvas
      className="rankora-canvas"
      camera={{ position: [0, 0.1, 6.4], fov: 36, near: 0.1, far: 60 }}
      dpr={env.dpr}
      shadows={env.shadows}
      gl={{
        antialias: env.tier !== 'low',
        alpha: false,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.06
      }}
    >
      <Scene />
    </Canvas>
  )
}
