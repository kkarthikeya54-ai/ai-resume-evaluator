import { useEffect, useRef, useState } from "react";
import useInView from "./useInView";

export default function useCountUp(target, { start = 0, duration = 1200, delay = 0 } = {}) {
  const [ref, inView] = useInView();
  const [value, setValue] = useState(start);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!inView) {
      // IntersectionObserver starvation: occluded/embedded webviews can also
      // stop IO callbacks, leaving the count stranded at the start value
      // even though the element is on screen. Settle late (well beyond any
      // normal animation) — off-screen elements re-animate from the start
      // value on scroll-in, so normal browsers are unaffected.
      const late = setTimeout(() => setValue(target), duration + delay + 3000);
      return () => clearTimeout(late);
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return undefined;
    }
    // rAF is throttled/paused in hidden tabs and embedded webviews — without
    // this guard the count would strand at the start value (e.g. "0") until
    // the tab is focused again. Same hardening as the chat typewriter.
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      setValue(target);
      return undefined;
    }
    let startTime = null;
    const tick = (now) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime - delay;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(start + (target - start) * (progress === 1 ? 1 : eased)));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    // Some occluded/embedded webviews report visibilityState "visible" but
    // never tick rAF — the count would strand at the start value (e.g. "0")
    // until an unrelated re-render. If no frame advances within the expected
    // window, settle on the final value instead of showing a wrong number.
    const failSafe = setTimeout(() => setValue(target), duration + delay + 600);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(failSafe);
    };
  }, [inView, target, start, duration, delay]);

  return [ref, value];
}
