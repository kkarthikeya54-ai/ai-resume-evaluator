import { useEffect, useState } from "react";
import { subscribeToRun } from "../utils/analysisEvents";
import { subscribeGemini } from "../services/gemini";

/**
 * useAnalysisRunState — tracks the student's batch analysis run so the
 * hero can show a staged meter and the live readiness score.
 *
 * subscribeGemini emits (type, "start"|"done"|"error", payload) where type
 * is the prompt key ("readiness", "skillGap", "roadmap", ...). Rather than
 * hardcoding a section total, the meter is self-calibrating: total = all
 * types seen this run, ready = types resolved — so it always converges to
 * 100% exactly when the batch actually finishes, whatever its size.
 */
export default function useAnalysisRunState() {
  const [pending, setPending] = useState(() => new Set());
  const [ready, setReady] = useState(() => new Set());
  const [readyScore, setReadyScore] = useState(null);

  useEffect(() => {
    // A new batch run resets the meter
    const unsubRun = subscribeToRun(() => {
      setPending(new Set());
      setReady(new Set());
      setReadyScore(null);
    });

    const unsub = subscribeGemini((type, state, payload) => {
      // parseResume is a parsing step, not an AI analysis section — exclude it
      // so the meter reflects analyses only (score, gaps, roadmap, ...).
      if (type === "parseResume") return;
      if (state === "start") {
        setPending((prev) => {
          if (prev.has(type)) return prev;
          const next = new Set(prev);
          next.add(type);
          return next;
        });
        return;
      }

      // done | error
      setPending((prev) => {
        if (!prev.has(type)) return prev;
        const next = new Set(prev);
        next.delete(type);
        return next;
      });

      if (state === "done") {
        setReady((prev) => {
          if (prev.has(type)) return prev;
          const next = new Set(prev);
          next.add(type);
          return next;
        });
        if (type === "readiness") {
          const score = Number(payload?.score ?? payload?.data?.score);
          if (Number.isFinite(score)) setReadyScore(Math.round(score));
        }
      }
    });

    return () => {
      unsubRun();
      unsub();
    };
  }, []);

  const sectionsReady = ready.size;
  const totalSections = ready.size + pending.size;
  const running = pending.size > 0;
  return { sectionsReady, totalSections, running, readyScore };
}
