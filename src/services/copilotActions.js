/**
 * Copilot action protocol (v2 — fence-tolerant, prose-preserving).
 *
 * The copilot's prompt instructs it to append a machine-readable action
 * block when it recommends shortlist or pipeline-status changes. The client
 * parses that block, strips it from the displayed answer, and shows an
 * "Apply" bar so the HR user can apply the changes with one explicit
 * confirmation.
 *
 * Wire format the model is told to emit (last thing in its answer):
 *
 *   Some prose recommendation ...
 *
 *   <<SHORTLIST_ACTIONS>>
 *   {"add": [1, 4], "remove": [7],
 *    "statusChanges": [{"rank": 3, "status": "interviewing"}],
 *    "reason": "Top scores and keyword fit"}
 *   <<END_ACTIONS>>
 *
 * Ranks are 1-based candidate ranks. `reason` is optional. Valid pipeline
 * statuses: "screened" | "shortlisted" | "interviewing" | "hired" (anything
 * else — e.g. "rejected", which has no pipeline column — is dropped).
 */

const ACTIONS_START = "<<SHORTLIST_ACTIONS>>";
const ACTIONS_END = "<<END_ACTIONS>>";

/** Pipeline statuses the UI (kanban board) actually supports. */
export const PIPELINE_STATUSES = ["screened", "shortlisted", "interviewing", "hired"];

/** Common model spellings → canonical pipeline status. */
const STATUS_ALIASES = {
  screened: "screened",
  screen: "screened",
  applied: "screened",
  new: "screened",
  shortlisted: "shortlisted",
  shortlist: "shortlisted",
  interviewing: "interviewing",
  interview: "interviewing",
  hired: "hired",
  hire: "hired",
};

export const SHORTLIST_ACTION_PROMPT = `

AFTER your answer, if (and only if) your recommendation changes the pipeline —
who is shortlisted, or a candidate's stage — append this exact action block as
the last thing in your reply:

<<SHORTLIST_ACTIONS>>
{"add": [rank numbers], "remove": [rank numbers], "statusChanges": [{"rank": 3, "status": "interviewing"}], "reason": "one short sentence"}
<<END_ACTIONS>>

Rules for the block:
- Use 1-based candidate ranks that exist in CANDIDATE EVALUATIONS.
- "add"/"remove" change the shortlist. "statusChanges" moves a candidate's
  pipeline stage; status must be exactly one of: "screened", "shortlisted",
  "interviewing", "hired". There is no "rejected" stage — never use it.
- Omit any field that is empty; omit "reason" if not needed.
- Do not use the block unless the user asked for a decision or you are
  recommending a change (e.g. "shortlist the top 3", "move #2 to interview",
  "update my shortlist").
- Never include the block for pure informational answers.`;

/**
 * Parse and strip the action block from a copilot answer.
 * Returns { cleanAnswer, actions } where actions is null when absent/invalid.
 * actions: { add: number[], remove: number[], reason: string }
 */
/**
 * Normalize the model's statusChanges entries to canonical pipeline statuses.
 * Accepts objects {rank, status}; drops unknown/unsupported statuses
 * (synonyms like "interview" are mapped). Returns [{rank, status}].
 */
function normalizeStatusChanges(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    const rank = parseInt(item?.rank, 10);
    const status = STATUS_ALIASES[String(item?.status || "").trim().toLowerCase()];
    if (Number.isInteger(rank) && rank > 0 && status) {
      out.push({ rank, status });
    }
  }
  return out;
}

export function parseShortlistActions(answer) {
  const text = String(answer || "");
  const start = text.indexOf(ACTIONS_START);
  if (start === -1) return { cleanAnswer: text.trim(), actions: null };

  const rest = text.slice(start + ACTIONS_START.length);
  const endIdx = rest.indexOf(ACTIONS_END);
  const jsonChunk = (endIdx === -1 ? rest : rest.slice(0, endIdx)).trim();

  const before = text.slice(0, start).trim();
  // Some models place the block first, or append prose after it — keep that
  // prose so the answer bubble is never empty.
  const after =
    endIdx === -1 ? "" : rest.slice(endIdx + ACTIONS_END.length).trim();
  let cleanAnswer = [before, after].filter(Boolean).join("\n\n");
  if (!cleanAnswer) {
    // The whole answer was the block. Show it sans marker tokens and code
    // fences rather than rendering an empty bubble.
    cleanAnswer = text
      .replace(ACTIONS_START, "")
      .replace(ACTIONS_END, "")
      .replace(/```[a-zA-Z]*\s*/g, "")
      .trim();
  }

  let actions = null;
  try {
    // Models may wrap the JSON in markdown code fences or add commentary.
    // Extract the actual JSON object before parsing.
    let jsonText = jsonChunk.replace(/```[a-zA-Z]*\s*/g, "").trim();
    const braceStart = jsonText.indexOf("{");
    const braceEnd = jsonText.lastIndexOf("}");
    if (braceStart !== -1 && braceEnd > braceStart) {
      jsonText = jsonText.slice(braceStart, braceEnd + 1);
    }
    const parsed = JSON.parse(jsonText);
    const toInts = (v) =>
      Array.isArray(v) ? v.map((n) => parseInt(n, 10)).filter((n) => Number.isInteger(n) && n > 0) : [];
    const add = toInts(parsed.add);
    const remove = toInts(parsed.remove);
    const statusChanges = normalizeStatusChanges(parsed.statusChanges);
    if (add.length || remove.length || statusChanges.length) {
      actions = {
        add,
        remove,
        statusChanges,
        reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 200) : "",
      };
    }
  } catch {
    actions = null; // malformed block: apply nothing, strip from the shown answer
  }

  return { cleanAnswer, actions };
}

/**
 * Resolve 1-based ranks to candidate ids and validate against the session.
 * Returns { adds: string[], removes: string[], statusChanges: {id, status}[] }.
 * Ranks that don't exist in the session are dropped.
 */
export function resolveActionRanks(actions, candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  const byRank = new Map(list.map((c) => [c.rank, c]));
  const resolve = (ranks) =>
    ranks.map((r) => byRank.get(r)?.id).filter(Boolean);
  const statusChanges = (actions.statusChanges || [])
    .map(({ rank, status }) => {
      const id = byRank.get(rank)?.id;
      return id ? { id, status } : null;
    })
    .filter(Boolean);
  return {
    adds: resolve(actions.add || []),
    removes: resolve(actions.remove || []),
    statusChanges,
  };
}

/**
 * Compute the next candidate state from an applied action set.
 * `statusChanges` is [{id, status}]; a candidate's explicit stage change is
 * applied on top of any shortlist add/remove (explicit stage wins), and —
 * mirroring the manual status setter — it does not touch `shortlisted`.
 */
export function applyShortlistActions(
  candidates,
  { adds = [], removes = [], statusChanges = [] }
) {
  const addSet = new Set(adds);
  const removeSet = new Set(removes);
  const statusById = new Map(statusChanges.map((s) => [s.id, s.status]));
  return candidates.map((c) => {
    let shortlisted = Boolean(c.shortlisted);
    if (addSet.has(c.id)) shortlisted = true;
    if (removeSet.has(c.id)) shortlisted = false;
    // Keep the status mirror in sync exactly like a manual toggle would.
    let status = c.status || "screened";
    if (shortlisted && status === "screened") status = "shortlisted";
    if (!shortlisted && status === "shortlisted") status = "screened";
    // Explicit stage change overrides, and leaves `shortlisted` as-is
    // (same semantics as the dashboard's manual status update).
    if (statusById.has(c.id)) status = statusById.get(c.id);
    return { ...c, shortlisted, status };
  });
}

/**
 * Audit trail for copilot-applied changes.
 *
 * An entry captures exactly what changed (before → after per candidate) plus
 * the inverse action, so any apply can be undone without trusting the current
 * session state to match. Entries are stored on the session payload under
 * `copilotAudit` (newest first), capped at MAX_AUDIT_ENTRIES.
 */
export const MAX_AUDIT_ENTRIES = 25;

/** Build an audit entry from the candidates before/after an apply. */
export function buildAuditEntry({
  before,
  after,
  reason = "",
  appliedAt = new Date().toISOString(),
}) {
  const rankOf = (list, id) => {
    const c = (list || []).find((x) => x.id === id);
    return c ? c.rank ?? null : null;
  };
  const nameOf = (list, id) => {
    const c = (list || []).find((x) => x.id === id);
    return (c && c.evaluation && c.evaluation.name) || (c && c.fileName) || "Candidate";
  };

  const changes = [];
  for (const b of before) {
    const a = after.find((x) => x.id === b.id);
    if (!a) continue;
    const diff = {};
    if (Boolean(b.shortlisted) !== Boolean(a.shortlisted)) {
      diff.shortlisted = { before: Boolean(b.shortlisted), after: Boolean(a.shortlisted) };
    }
    const bs = b.status || "screened";
    const as = a.status || "screened";
    if (bs !== as) diff.status = { before: bs, after: as };
    if (diff.shortlisted || diff.status) {
      changes.push({
        id: b.id,
        rank: rankOf(before, b.id),
        name: nameOf(before, b.id),
        ...diff,
      }
      );
    }
  }
  if (!changes.length) return null;

  return { id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, appliedAt, reason, changes };
}

/** Prepend an entry to the session's audit log (newest first), capped.
 *  Null entries (no-op applies) are ignored. */
export function unshiftAuditEntry(session, entry) {
  if (!entry || !Array.isArray(entry.changes) || !entry.changes.length) {
    return session || {};
  }
  const log = Array.isArray(session && session.copilotAudit) ? session.copilotAudit : [];
  return { ...session, copilotAudit: [entry, ...log].slice(0, MAX_AUDIT_ENTRIES) };
}

/**
 * Undo an audit entry against the current candidates.
 * Returns null when the session has drifted (candidate gone or state already
 * matches neither the before nor the after snapshot) — the caller shows an
 * error instead of guessing.
 * Returns { candidates, entry } on success.
 */
export function applyAuditUndo(candidates, entry) {
  const list = Array.isArray(candidates) ? candidates : [];
  const next = list.map((c) => {
    const change = entry.changes.find((ch) => ch.id === c.id);
    if (!change) return c;
    let out = c;
    if (change.shortlisted) {
      out = { ...out, shortlisted: change.shortlisted.before };
    }
    if (change.status) {
      out = { ...out, status: change.status.before };
    }
    return out;
  });

  // Drift check on the ORIGINAL list: every change must match either its
  // after snapshot (still applied — safe to revert) or its before snapshot
  // (already reverted — a no-op). Anything else means the session moved on
  // (manual edits, later applies) and undoing would corrupt state.
  const drift = entry.changes.some((ch) => {
    const c = list.find((x) => x.id === ch.id);
    if (!c) return true; // candidate removed since apply
    const sNow = Boolean(c.shortlisted);
    const stNow = c.status || "screened";
    const sMatchAfter = !ch.shortlisted || sNow === ch.shortlisted.after;
    const stMatchAfter = !ch.status || stNow === ch.status.after;
    const matchesAfter = sMatchAfter && stMatchAfter;
    const sMatchBefore = !ch.shortlisted || sNow === ch.shortlisted.before;
    const stMatchBefore = !ch.status || stNow === ch.status.before;
    const matchesBefore = sMatchBefore && stMatchBefore;
    return !(matchesAfter || matchesBefore);
  });
  if (drift) return null;
  return { candidates: next, entry };
}
