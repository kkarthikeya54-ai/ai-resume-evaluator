import { useEffect, useRef, useState } from 'react'

const STUDENT_SKILLS = [
  { name: 'React · TypeScript', level: 94 },
  { name: 'Python · Machine Learning', level: 88 },
  { name: 'System Design', level: 62, gap: true },
]

const CANDIDATES = [
  { rank: '01', name: 'Aarav S.', role: 'Full-Stack Developer', score: 96, top: true },
  { rank: '02', name: 'Meera K.', role: 'Data Scientist', score: 92 },
  { rank: '03', name: 'Dev P.', role: 'Backend Engineer', score: 87 },
  { rank: '04', name: 'Isha R.', role: 'Frontend Engineer', score: 81 },
]

/*
 * Showcase3D — the product workspace as a cursor-reactive layered scene.
 * Same mechanism as the reference implementation: a perspective stage whose
 * rotateX/rotateY track the pointer, with UI layers stacked at increasing
 * translateZ depths. Rebuilt in the app's palette with the real product's
 * two audiences (student workspace / recruiter mode).
 */
export default function Showcase3D({ onAnalyze, onHR }) {
  const sectionRef = useRef(null)
  const angles = useRef({ tx: 14, ty: -14, x: 14, y: -14 })
  const spin = useRef(0)
  const [flat, setFlat] = useState(false)
  const [autoSpin, setAutoSpin] = useState(false)
  const [mode, setMode] = useState('student')
  const [visible, setVisible] = useState(false)

  const reduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current

  // pause the loop when offscreen — cheap and the section is tall
  useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // one damped rAF loop drives tilt + optional spin
  useEffect(() => {
    if (!visible) return
    let raf
    const tick = () => {
      const a = angles.current
      spin.current += 0.0045
      let tx = a.tx
      let ty = a.ty
      if (autoSpin && !flat && !reduced) {
        tx = 14 + Math.sin(spin.current) * 7
        ty = Math.cos(spin.current) * 18
      }
      a.x += (tx - a.x) * 0.075
      a.y += (ty - a.y) * 0.075
      const stage = sectionRef.current?.querySelector('.rk3d-stage')
      if (stage) {
        stage.style.transform = flat
          ? 'rotateX(0deg) rotateY(0deg)'
          : `rotateX(${a.x.toFixed(2)}deg) rotateY(${a.y.toFixed(2)}deg)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [autoSpin, flat, visible, reduced])

  const onMove = (e) => {
    if (flat || reduced || autoSpin) return
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return
    const nx = (e.clientX - rect.left) / rect.width - 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5
    angles.current.tx = 14 - ny * 22
    angles.current.ty = nx * 26 - 4
  }

  const onLeave = () => {
    if (!autoSpin) { angles.current.tx = 14; angles.current.ty = -14 }
  }

  const z = (i) => (flat ? 'translateZ(0px)' : `translateZ(${i * 55}px)`)

  return (
    <section
      ref={sectionRef}
      className="rankora-showcase"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="rankora-showcase__inner">
        <header className="rankora-showcase__head">
          <span className="rankora-eyebrow"><i className="rankora-eyebrow__tick" />Live Product Preview</span>
          <h2 className="rankora-h2 rankora-h2--lg">
            The Workspace, <em>In Perspective.</em>
          </h2>
          <p className="rankora-showcase__sub">
            This is the actual interface waiting on the other side of your resume.
            Move your cursor — every layer reacts.
          </p>

          <div className="rankora-showcase__controls">
            <div className="rankora-showcase__seg">
              <button className={mode === 'student' ? 'is-on' : ''} onClick={() => setMode('student')}>
                Student Workspace
              </button>
              <button className={mode === 'recruiter' ? 'is-on' : ''} onClick={() => setMode('recruiter')}>
                Recruiter Mode
              </button>
            </div>
            <button
              className={`rankora-showcase__pill ${autoSpin ? 'is-on' : ''}`}
              onClick={() => setAutoSpin(v => !v)}
            >
              {autoSpin ? 'Pause 3D Spin' : 'Auto 3D Spin'}
            </button>
            <button
              className={`rankora-showcase__pill ${flat ? 'is-on' : ''}`}
              onClick={() => setFlat(v => !v)}
            >
              {flat ? 'Back to 3D' : 'Flat Preview'}
            </button>
          </div>
        </header>

        <div className="rankora-showcase__stage-wrap">
          <div className="rk3d-stage">
            {/* LAYER 0 — dot-grid foundation */}
            <div className="rk3d-layer rk3d-floor" style={{ transform: z(0) }} aria-hidden="true" />

            {/* LAYER 1 — the app frame */}
            <div className="rk3d-layer rk3d-frame" style={{ transform: z(1) }}>
              <div className="rk3d-chrome">
                <span className="rk3d-dots"><i /><i /><i /></span>
                <span className="rk3d-url">resume-eval://workspace/{mode}</span>
                <span className="rk3d-live">AI Engine Active</span>
              </div>

              <div className="rk3d-grid">
                {mode === 'student' ? (
                  <>
                    <div className="rk3d-card rk3d-main">
                      <div className="rk3d-cardhead">
                        <h3>Placement Readiness Overview</h3>
                        <span>Live AI Score</span>
                      </div>
                      <div className="rk3d-scoreline">
                        <div className="rk3d-donut">
                          <svg viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.9" className="rk3d-donut__track" />
                            <circle cx="18" cy="18" r="15.9" className="rk3d-donut__arc" strokeDasharray="100" strokeDashoffset="13" />
                          </svg>
                          <strong>87</strong>
                          <em>/ 100</em>
                        </div>
                        <div className="rk3d-bars">
                          {STUDENT_SKILLS.map((s) => (
                            <div key={s.name} className={`rk3d-bar ${s.gap ? 'is-gap' : ''}`}>
                              <div><span>{s.name}</span><b>{s.level}%</b></div>
                              <i style={{ width: `${s.level}%` }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="rk3d-card rk3d-side">
                      <em>Real-Time AI Diagnostics</em>
                      <h4>Top action: System Design &amp; cloud fundamentals</h4>
                      <p>Adding a distributed-systems project raises readiness by +9 points for Tier-1 full-stack roles.</p>
                      <button className="rk3d-cta" onClick={onAnalyze}>Analyze Your Resume →</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rk3d-card rk3d-main">
                      <div className="rk3d-cardhead">
                        <h3>Candidate Screening Funnel</h3>
                        <span>96 resumes parsed</span>
                      </div>
                      <div className="rk3d-cands">
                        {CANDIDATES.map((c) => (
                          <div key={c.rank} className="rk3d-cand">
                            <b>{c.rank}</b>
                            <div><strong>{c.name}</strong><span>{c.role}</span></div>
                            <em className={c.top ? 'is-top' : ''}>{c.score}%</em>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rk3d-card rk3d-side">
                      <em>AI HR Copilot</em>
                      <h4>&ldquo;Strongest backend experience?&rdquo;</h4>
                      <p>Dev P. — Python + Node.js across 3 production projects, with Docker and AWS in production.</p>
                      <button className="rk3d-cta" onClick={onHR}>Explore for HR Teams →</button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* LAYER 2 — floating skill capsules */}
            <div className="rk3d-layer rk3d-float rk3d-float--a" style={{ transform: z(2) }}>
              <i className="is-sage" /> Python · Machine Learning <b>Verified</b>
            </div>
            <div className="rk3d-layer rk3d-float rk3d-float--b" style={{ transform: z(2) }}>
              System Design: 88% match <b>High impact</b>
            </div>

            {/* LAYER 3 — foreground copilot dialog */}
            <div className="rk3d-layer rk3d-chat" style={{ transform: z(3) }}>
              <div className="rk3d-chat__who">
                <b>AI</b>
                <div><strong>AI Resume Copilot</strong><span>grounded in your parsed data</span></div>
              </div>
              <p>
                {mode === 'student'
                  ? '“Your roadmap is ready — 6 milestones from fundamentals to interviews.”'
                  : '“Ranked 96 candidates. Top match: Aarav S. (96%) — strong React and system design.”'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
