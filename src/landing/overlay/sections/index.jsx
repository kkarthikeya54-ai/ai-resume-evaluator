import { useEffect, useState } from 'react'
import { usePhase, PHASE_NAMES } from '../../utils/scroll'
import { Logo, CTAButton, Eyebrow, AnimatedHeadline, Lede } from '../../ui/kit'
import { CORAL, SAGE } from '../../utils/colors'

/* Shared phase-gated overlay wrapper */
function Gate({ name, children, className = '' }) {
  const phase = usePhase()
  const active = phase === PHASE_NAMES.indexOf(name)
  return (
    <section className={`rankora-gate ${active ? 'is-active' : ''} ${className}`}>
      {children(active, phase)}
    </section>
  )
}

/* 00 — PROLOGUE: near-empty screen, scroll hint only */
function Prologue() {
  return (
    <Gate name="prologue">
      {() => (
        <div className="rankora-prologue rv">
          <div className="rankora-scroll-hint">
            <span>Scroll to begin the analysis</span>
            <span className="rankora-scroll-hint__line" />
          </div>
        </div>
      )}
    </Gate>
  )
}

/* Screen-reader narrative mirror of the visual journey */
function StorySummary() {
  return (
    <div className="rankora-sr-only">
      <h1>HireTire — Every Hire on Podium.</h1>
      <p>
        HireTire is AI-powered career intelligence. The page is one continuous scroll journey:
        a single resume is parsed into skills, education, experience, projects, achievements and
        keywords; those become a career intelligence universe; a career readiness score assembles;
        missing skills surface against a target role; a personalized roadmap builds; preparation
        systems orbit the candidate; hundreds of resumes rank into the right candidates for HR
        teams; and an AI chat answers over the whole pool.
      </p>
      <p>Use Analyze Resume to start, or scroll to travel the full story.</p>
    </div>
  )
}

/* 01 — HERO */
function Hero({ onAnalyze }) {
  return (
    <Gate name="hero">
      {(active) => (
        <div className="rankora-hero">
          <div className="rankora-hero__inner">
            <div className="rankora-hero__badge rv" style={{ transitionDelay: '0.15s' }}>
              <Logo size={30} />
              <span>AI-Powered Career Intelligence</span>
            </div>

            <h1 className="rankora-h1">HireTire</h1>

            <p className="rankora-hero__tag rv" style={{ transitionDelay: '0.35s' }}>
              Your Resume. Understood.
            </p>

            <Lede delay={0.5}>
              Transform a static resume into skills, insights, opportunities, and a personalized path forward.
            </Lede>

            <div className="rankora-hero__ctas rv" style={{ transitionDelay: '0.65s' }}>
              <CTAButton onClick={onAnalyze}>Analyze Your Resume</CTAButton>
              <CTAButton variant="ghost" onClick={() => window.__rankoraScrollTo?.(0.2)}>
                Explore the Intelligence
              </CTAButton>
            </div>

            <div className="rankora-hero__flow rv" style={{ transitionDelay: '0.85s' }}>
              Resume <i>→</i> Intelligence <i>→</i> Growth
            </div>
          </div>
        </div>
      )}
    </Gate>
  )
}

/* 02 — RESUME PARSING */
function ResumeParsing() {
  const layers = ['Skills', 'Education', 'Experience', 'Projects', 'Achievements', 'Keywords']
  return (
    <Gate name="parsing">
      {(active) => (
        <div className="rankora-section rankora-section--left rankora-section--right">
          <Eyebrow>Resume Parsing</Eyebrow>
          <AnimatedHeadline active={active} lines={['One Resume.', 'Hundreds of Signals.']} />
          <Lede active={active} delay={0.5}>
            HireTire transforms unstructured career information into meaningful, connected insights.
          </Lede>
          <div className="rankora-layerlist">
            {layers.map((l, i) => (
              <div key={l} className="rankora-layer rv" style={{ transitionDelay: `${0.55 + i * 0.09}s` }}>
                <span className="rankora-layer__idx">0{i + 1}</span>
                <span className="rankora-layer__name">{l}</span>
                <span className="rankora-layer__wire" />
              </div>
            ))}
          </div>
        </div>
      )}
    </Gate>
  )
}

/* 03 — CAREER INTELLIGENCE UNIVERSE */
function CareerIntelligence() {
  return (
    <Gate name="universe">
      {(active) => (
        <div className="rankora-section rankora-section--center">
          <Eyebrow>Career Intelligence</Eyebrow>
          <AnimatedHeadline active={active} lines={['See What Your Resume', "Doesn't Show at First Glance."]} align="center" />
          <Lede active={active} delay={0.5}>
            Every skill becomes a node. Every connection becomes a signal — strength, gaps, readiness, role fit.
          </Lede>
        </div>
      )}
    </Gate>
  )
}

/* 04 — CAREER READINESS */
function ReadinessScore() {
  return (
    <Gate name="readiness">
      {() => (
        <div className="rankora-section rankora-section--center">
          <div className="rankora-score">
            <span className="rankora-score__num">87</span>
            <span className="rankora-score__label">Career Readiness Score</span>
          </div>
          <div className="rankora-score-orbits">
            {[
              ['Strengths', 'Strong foundation'],
              ['Growth Areas', 'Skills to develop'],
              ['Target Roles', 'Recommended directions'],
              ['Next Steps', 'Personalized actions'],
            ].map(([title, sub], i) => (
              <div
                key={title}
                className={`rankora-orbit-card rankora-orbit-card--${i} rv`}
                style={{ transitionDelay: `${0.35 + i * 0.12}s` }}
              >
                <strong>{title}</strong>
                <span>{sub}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Gate>
  )
}

/* 05 — FIND YOUR GAP */
function GapAnalysis() {
  return (
    <Gate name="gap">
      {(active) => (
        <div className="rankora-section rankora-section--center">
          <Eyebrow>Skills Gap</Eyebrow>
          <AnimatedHeadline active={active} lines={["Know What's Missing.", 'Know What to Build Next.']} align="center" />
          <Lede active={active} delay={0.5}>
            Your profile against your target role — matched skills connect, missing skills glow before your eyes.
          </Lede>
          <div className="rankora-gaplegend rv" style={{ transitionDelay: '0.8s' }}>
            <span><i style={{ background: SAGE }} /> Matched</span>
            <span><i style={{ background: CORAL }} /> Missing</span>
          </div>
        </div>
      )}
    </Gate>
  )
}

/* 06 — ROADMAP */
function Roadmap() {
  return (
    <Gate name="roadmap">
      {(active) => (
        <div className="rankora-section rankora-section--top">
          <Eyebrow>Career Roadmap</Eyebrow>
          <AnimatedHeadline active={active} lines={["Don't Just Get Feedback.", 'Get a Direction.']} align="center" />
          <Lede active={active} delay={0.5}>
            Missing skills become milestones. Milestones become a path — from where you are to where you're going.
          </Lede>
        </div>
      )}
    </Gate>
  )
}

/* 07 — INTERVIEW & PREP ORBIT */
function InterviewPrep() {
  return (
    <Gate name="prep">
      {(active) => (
        <div className="rankora-section rankora-section--top">
          <Eyebrow>Preparation Systems</Eyebrow>
          <AnimatedHeadline active={active} lines={['From Resume', 'to Ready.']} align="center" />
          <Lede active={active} delay={0.5}>
            Interview prep, DSA drills, curated content and resume fixes — every system orbits your goal.
          </Lede>
        </div>
      )}
    </Gate>
  )
}

/* 08 — HR INTELLIGENCE */
function HRIntelligence() {
  return (
    <Gate name="hr">
      {(active) => (
        <div className="rankora-section rankora-section--center">
          <Eyebrow>For HR Teams</Eyebrow>
          <AnimatedHeadline active={active} lines={['From Hundreds of Resumes', 'to the Right Candidates.']} align="center" />
          <Lede active={active} delay={0.5}>
            Upload in bulk. HireTire parses every resume, scores every candidate, and ranks the shortlist for you.
          </Lede>
          <div className="rankora-chiplist">
            {['Multi-file upload', 'Candidate ranking', 'Comparison', 'HR dashboard'].map((c, i) => (
              <span key={c} className="rankora-chip rv" style={{ transitionDelay: `${0.6 + i * 0.08}s` }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </Gate>
  )
}

/* 09 — AI HR CHAT */
function AIHRChat() {
  return (
    <Gate name="chat">
      {(active) => (
        <div className="rankora-section rankora-section--top">
          <Eyebrow>AI HR Chat</Eyebrow>
          <AnimatedHeadline active={active} lines={['Ask. Compare.', 'Decide in Seconds.']} align="center" />
          <Lede active={active} delay={0.5}>
            Natural-language questions over your whole candidate pool — answers grounded in parsed resume data.
          </Lede>
        </div>
      )}
    </Gate>
  )
}

/* 10 — FINAL TRANSFORMATION. Fades itself out the moment the product
   showcase below the track scrolls into view — the interface takes over. */
function FinalCollapse({ onAnalyze }) {
  const [veiled, setVeiled] = useState(false)

  useEffect(() => {
    const target = document.querySelector('.rankora-showcase')
    if (!target || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setVeiled(e.isIntersecting), { threshold: 0.18 })
    io.observe(target)
    return () => io.disconnect()
  }, [])

  return (
    <Gate name="collapse">
      {(active) => (
        <div className={`rankora-section rankora-section--center ${veiled ? 'is-veiled' : ''}`}>
          <AnimatedHeadline active={active} lines={['Your Resume Is Where It Starts.', 'Your Potential Is What Comes Next.']} align="center" size="lg" />
          <div className="rankora-hero__ctas rv" style={{ transitionDelay: '0.7s' }}>
            <CTAButton onClick={onAnalyze}>Analyze Your Resume</CTAButton>
            <CTAButton variant="ghost" onClick={() => window.__rankoraScrollTo?.(0.785)}>
              Explore for HR Teams
            </CTAButton>
          </div>
        </div>
      )}
    </Gate>
  )
}

export default function OverlaySections({ onAnalyze }) {
  return (
    <div className="rankora-overlays">
      <StorySummary />
      <Prologue onAnalyze={onAnalyze} />
      <Hero onAnalyze={onAnalyze} />
      <ResumeParsing />
      <CareerIntelligence />
      <ReadinessScore />
      <GapAnalysis />
      <Roadmap />
      <InterviewPrep />
      <HRIntelligence />
      <AIHRChat />
      <FinalCollapse onAnalyze={onAnalyze} />
    </div>
  )
}
