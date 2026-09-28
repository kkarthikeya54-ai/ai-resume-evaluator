import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CORAL, SAGE } from '../../utils/colors'

const STAGES = [
  { label: 'Reading Resume', sub: 'Parsing structure and content' },
  { label: 'Extracting Information', sub: 'Skills, education, experience' },
  { label: 'Understanding Skills', sub: 'Mapping relationships and patterns' },
  { label: 'Analyzing Experience', sub: 'Depth, impact, and gaps' },
  { label: 'Calculating Readiness', sub: 'Score and signals' },
  { label: 'Finding Opportunities', sub: 'Roles and next steps' },
]

const ROLES = [
  'Software Engineer', 'Data Scientist', 'ML Engineer',
  'Product Manager', 'DevOps Engineer', 'Full-Stack Developer',
]

const RESULT = {
  score: 87,
  strengths: ['React ecosystem', 'TypeScript', 'System design basics'],
  gaps: ['Cloud platforms', 'System design at scale', 'Containerization'],
  steps: [
    'Complete an AWS Solutions Architect path',
    'Build and deploy a large-scale system project',
    'Ship a containerized microservices portfolio piece',
  ],
}

export default function AnalysisModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('form') // form | sequence | ready
  const [stageIdx, setStageIdx] = useState(0)
  const [file, setFile] = useState(null)
  const [role, setRole] = useState(ROLES[0])
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState('')
  const [score, setScore] = useState(0)
  const closeRef = useRef(null)
  const reduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current

  // reset when reopened — including any file left over from the last session
  useEffect(() => {
    if (isOpen) {
      setMode('form')
      setStageIdx(0)
      setScore(0)
      setFile(null)
      setFileError('')
      setDragOver(false)
    }
  }, [isOpen])

  // dialog semantics: Escape closes, focus moves in, background scroll locks
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = setTimeout(() => closeRef.current?.focus(), 80)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      clearTimeout(focusTimer)
    }
  }, [isOpen, onClose])

  // cinematic sequence timing
  useEffect(() => {
    if (mode !== 'sequence') return
    const step = reduced ? 120 : 850
    if (stageIdx < STAGES.length) {
      const t = setTimeout(() => setStageIdx((i) => i + 1), step)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setMode('ready'), reduced ? 60 : 900)
    return () => clearTimeout(t)
  }, [mode, stageIdx, reduced])

  // score count-up on ready (interval-driven: survives rAF throttling)
  useEffect(() => {
    if (mode !== 'ready') return
    if (reduced) { setScore(RESULT.score); return }
    const start = performance.now()
    const dur = 1600
    const iv = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / dur)
      setScore(Math.round(RESULT.score * (1 - Math.pow(1 - p, 3))))
      if (p >= 1) clearInterval(iv)
    }, 40)
    return () => clearInterval(iv)
  }, [mode])

  if (!isOpen) return null

  const acceptFile = (f) => {
    if (!f) return
    if (!/\.(pdf|docx)$/i.test(f.name)) {
      setFileError('PDF or DOCX only — that file type cannot be parsed.')
      setFile(null)
      return
    }
    setFileError('')
    setFile(f)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    acceptFile(e.dataTransfer?.files?.[0])
  }

  return (
    <AnimatePresence>
      <motion.div
        className="rankora-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="rankora-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rankora-modal-title"
          initial={{ opacity: 0, y: 46, scale: 0.96, rotateX: 6 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, y: 30, scale: 0.97 }}
          transition={{ type: 'spring', damping: 26, stiffness: 240 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rankora-modal__glow" aria-hidden="true" />
          <header className="rankora-modal__head">
            <div>
              <h3 id="rankora-modal-title">Analyze Resume</h3>
              <p>AI-powered career intelligence</p>
            </div>
            <button ref={closeRef} className="rankora-modal__close" onClick={onClose} aria-label="Close dialog">✕</button>
          </header>

          {mode === 'form' && (
            <div className="rankora-modal__body">
              <label
                className={`rankora-dropzone ${dragOver ? 'is-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <input
                  type="file"
                  accept=".pdf,.docx"
                  className="rankora-sr-only"
                  onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
                />
                <motion.span
                  className="rankora-dropzone__icon"
                  animate={dragOver ? { scale: 1.18, y: -4 } : { scale: 1, y: 0 }}
                >
                  ↑
                </motion.span>
                <strong>{file ? file.name : 'Drop your resume here'}</strong>
                <span className="rankora-dropzone__hint">
                  {file ? 'Click to replace' : 'PDF or DOCX — or click to browse'}
                </span>
                {fileError && <span className="rankora-dropzone__error">{fileError}</span>}
              </label>

              <div className="rankora-field">
                <label>Target Role</label>
                <div className="rankora-roles">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      className={`rankora-role ${role === r ? 'is-selected' : ''}`}
                      onClick={() => setRole(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="rankora-modal__cta"
                onClick={() => setMode('sequence')}
              >
                Begin Analysis →
              </button>
            </div>
          )}

          {mode === 'sequence' && (
            <div className="rankora-modal__body rankora-sequence" role="status" aria-live="polite">
              <div className="rankora-sequence__line" aria-hidden="true">
                {STAGES.map((_, i) => (
                  <motion.i
                    key={i}
                    initial={false}
                    animate={{ backgroundColor: i < stageIdx ? CORAL : 'rgba(250,248,245,0.12)' }}
                    style={{ boxShadow: i < stageIdx ? `0 0 10px ${CORAL}` : 'none' }}
                  />
                ))}
              </div>
              <AnimatePresence mode="wait">
                {stageIdx < STAGES.length ? (
                  <motion.div
                    key={stageIdx}
                    className="rankora-sequence__stage"
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.4 }}
                  >
                    <span className="rankora-sequence__num">0{stageIdx + 1}</span>
                    <strong>{STAGES[stageIdx].label}</strong>
                    <span className="rankora-sequence__sub">{STAGES[stageIdx].sub}</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <motion.p
                className="rankora-sequence__meta"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.55 }}
              >
                {file ? file.name : 'resume.pdf'} → {role}
              </motion.p>
            </div>
          )}

          {mode === 'ready' && (
            <motion.div
              className="rankora-modal__body rankora-ready"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="rankora-ready__score">
                <span className="rankora-ready__num">{score}</span>
                <span className="rankora-ready__label">Intelligence Ready.<br />Career Readiness Score</span>
              </div>
              <div className="rankora-ready__grid">
                <div className="rankora-ready__card">
                  <h4 style={{ color: SAGE }}>Strengths</h4>
                  <ul>{RESULT.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
                </div>
                <div className="rankora-ready__card">
                  <h4 style={{ color: CORAL }}>Gaps</h4>
                  <ul>{RESULT.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
                </div>
              </div>
              <div className="rankora-ready__steps">
                <h4>Next Steps</h4>
                {RESULT.steps.map((s, i) => (
                  <div key={s} className="rankora-ready__step">
                    <span>{i + 1}</span>{s}
                  </div>
                ))}
              </div>
              <button className="rankora-modal__cta" onClick={onClose}>
                Continue to RANKORA
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
