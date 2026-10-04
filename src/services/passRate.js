/**
 * Pass-rate auto-rejection.
 *
 * The HR user picks a minimum score (0–100) via a slider. Every candidate
 * whose overall score is below that threshold is moved to the "rejected"
 * pipeline stage. Candidates the system auto-rejected remember where they
 * came from (`rejectedFrom`) so lowering or clearing the threshold restores
 * them, while manually rejected candidates (no marker) are never touched.
 *
 * The reverse override exists too: a candidate rescued by hand (Restore
 * button, or dragged out of Rejected) carries `passRateExempt` and is never
 * auto-rejected again — until the recruiter moves the slider, which is an
 * explicit re-run of the policy over everyone (clearExemptions).
 */

export const DEFAULT_PASS_RATE = 0;

/** Overall score for a candidate, mirroring the table/kanban display. */
export function scoreOf(candidate) {
  return candidate?.scores?.total ?? candidate?.scores?.overall ?? 0;
}

/** Clamp a threshold to the 0–100 integer range the slider produces. */
export function clampPassRate(value) {
  const n = Math.round(Number(value) || 0);
  return Math.max(0, Math.min(100, n));
}

/** How many candidates currently score below `threshold` and would still
 *  be auto-rejected by it (candidates the recruiter manually rescued via
 *  `passRateExempt` are skipped). */
export function countBelow(candidates, threshold) {
  const t = clampPassRate(threshold);
  if (!t) return 0;
  return (Array.isArray(candidates) ? candidates : []).filter(
    (c) => scoreOf(c) < t && !c.passRateExempt
  ).length;
}

function restoreAutoRejected(candidate) {
  const from = typeof candidate.rejectedFrom === "string" ? candidate.rejectedFrom : "screened";
  const rest = { ...candidate };
  delete rest.rejectedFrom;
  return { ...rest, status: from };
}

/**
 * Apply a pass-rate threshold to the candidate list.
 * Returns { candidates, rejected, restored }:
 *  - rejected: candidates newly moved to "rejected" (marker kept)
 *  - restored: auto-rejected candidates whose score now clears the
 *    (lowered) threshold — put back to their previous stage.
 * A threshold of 0 disables auto-rejection and restores every
 * auto-rejected candidate; manual rejections always survive.
 */
export function applyPassRate(candidates, threshold) {
  const list = Array.isArray(candidates) ? candidates : [];
  const t = clampPassRate(threshold);
  let rejected = 0;
  let restored = 0;

  const next = list.map((c) => {
    const score = scoreOf(c);

    // `passRateExempt` marks a candidate the recruiter manually rescued
    // from the threshold — a standing "keep this one" that survives
    // reloads until the slider moves (see clearExemptions).
    if (t > 0 && score < t && c.status !== "rejected" && !c.passRateExempt) {
      rejected += 1;
      return { ...c, status: "rejected", rejectedFrom: c.status || "screened" };
    }

    const isAutoRejected =
      c.status === "rejected" && typeof c.rejectedFrom === "string";
    if (!isAutoRejected) return c;

    if (t === 0 || score >= t) {
      restored += 1;
      return restoreAutoRejected(c);
    }
    return c;
  });

  return { candidates: next, rejected, restored };
}

/**
 * Drop every `passRateExempt` marker. Called when the recruiter moves the
 * pass-rate slider: changing the threshold is an explicit re-run of the
 * policy over the whole pool, so per-candidate rescues lapse at that point.
 * Returns the input array untouched when there is nothing to clear.
 */
export function clearExemptions(candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (!list.some((c) => c.passRateExempt)) return list;
  return list.map((c) => {
    if (!c.passRateExempt) return c;
    const rest = { ...c };
    delete rest.passRateExempt;
    return rest;
  });
}
