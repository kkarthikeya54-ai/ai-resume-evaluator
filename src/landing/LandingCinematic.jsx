import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import "./landing.css";
import { initScrollStore, getScrollState } from "./utils/scroll";
import CanvasStage from "./overlay/CanvasStage";
import HiggsfieldLayer from "./overlay/HiggsfieldLayer";
import OverlaySections from "./overlay/sections";
import StoryScroll from "./overlay/StoryScroll";
import { Preloader, Nav, ScrollProgress, Footer } from "./ui/Chrome";
import Storyline from "./ui/Storyline";
import Showcase3D from "./ui/Showcase3D";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../services/role";

/**
 * Cinematic landing — one continuous scroll journey over a fixed WebGL stage.
 * Ported from the standalone landing build; branding, routing and auth are
 * wired to the main app:
 *  - Guests: every CTA goes to /login.
 *  - Signed-in users: CTAs jump straight to their role dashboard.
 * The standalone demo "Analyze Resume" modal is intentionally not mounted.
 */
export default function LandingCinematic() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [ready, setReady] = useState(false);

  const dashboardHref =
    role === ROLES.HR ? "/hr" : role === ROLES.STUDENT ? "/app" : "/onboarding";

  // single global scroll loop (drives the fixed 3D stage + phase overlays)
  useEffect(() => {
    const dispose = initScrollStore();
    // programmatic section jumps (nav + hero CTAs). p is a STORY fraction
    // (0..1 across the 11 phases); it converts to a page fraction through the
    // handoff knee so jumps land on the right chapter no matter where the
    // showcase sits below the track.
    window.__rankoraScrollTo = (p) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const knee = window.__rankora?.knee || 1;
      window.scrollTo({
        top: Math.min(max, Math.max(0, p * knee * max)),
        behavior: getScrollState().reduced ? "auto" : "smooth",
      });
    };
    return dispose;
  }, []);

  /* The one CTA behavior every button funnels through:
     guests → /login, signed-in users → their dashboard. */
  const primaryCta = useCallback(() => {
    navigate(user ? dashboardHref : "/login");
  }, [user, dashboardHref, navigate]);

  const scrollToHRSection = useCallback(() => {
    // signed-in HR goes straight to their dashboard; everyone else tours the story
    if (user && role === ROLES.HR) {
      navigate("/hr");
      return;
    }
    window.__rankoraScrollTo?.(0.785);
  }, [user, role]);

  const navCta = user
    ? { label: role === ROLES.HR ? "Open HR Dashboard" : "Open Dashboard" }
    : { label: "Sign In" };

  return (
    <MotionConfig reducedMotion="user">
      <div className="rankora-root" id="top">
        {!ready && <Preloader onDone={() => setReady(true)} />}

        {/* Fixed cinematic stage: WebGL + atmosphere */}
        <div className="rankora-stage">
          <CanvasStage />
          <HiggsfieldLayer />
          <div className="rankora-vignette" aria-hidden="true" />
        </div>

        <ScrollProgress />
        <Nav onCta={primaryCta} ctaLabel={navCta.label} />
        <Storyline />

        {/* Phase-gated DOM overlays (fade in/out over the fixed scene) */}
        <OverlaySections onAnalyze={primaryCta} />

        {/* Scroll length */}
        <StoryScroll />

        {/* The cursor-reactive product showcase — end of the journey */}
        <Showcase3D onAnalyze={primaryCta} onHR={scrollToHRSection} />

        <Footer />
      </div>
    </MotionConfig>
  );
}
