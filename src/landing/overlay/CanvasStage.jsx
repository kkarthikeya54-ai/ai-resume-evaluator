import { Suspense, lazy, useEffect, useState } from 'react'
import { checkWebGL } from '../utils/webgl'

const SceneCanvas = lazy(() => import('../scene/Scene').then((m) => ({ default: m.SceneCanvas })))

export default function CanvasStage() {
  const [ok, setOk] = useState(true)

  useEffect(() => {
    setOk(checkWebGL())
  }, [])

  if (!ok) {
    return (
      <div className="rankora-fallback" aria-hidden="true">
        <div className="rankora-fallback__glow" />
        <div className="rankora-fallback__grid" />
      </div>
    )
  }

  return (
    <div className="rankora-canvas-stage" aria-hidden="true">
      <Suspense fallback={<div className="rankora-canvas-loading" />}>
        <SceneCanvas />
      </Suspense>
    </div>
  )
}
