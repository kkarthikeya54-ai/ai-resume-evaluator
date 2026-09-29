import { removeResume } from "./resumeStorage";
import { clearSession as clearHrSession, clearCandidates } from "./hrStore";
import { deleteSessionsForUser } from "./sessionStore";
import { clearGeminiCache } from "./gemini";
import { deleteUserAccount as purgeHrCloudSessions } from "./hrBackend";

/**
 * Wipe every trace of a user's workspace data, so switching between
 * Student and HR Recruiter mode (or deleting account data) starts clean.
 *
 * Covers:
 *  - Supabase Storage: all objects under `resumes/{uid}/` (list + delete)
 *  - HR cloud mirror:  worker-KV sessions via POST /account/delete
 *  - Local:            IndexedDB sessions, resume metadata/text, hr cache,
 *                      gemini cache
 *
 * Deliberately best-effort (allSettled): a failing store must not block the
 * mode switch. Errors are swallowed here — the switch is a demo cleanup, not
 * a billing-sensitive operation.
 */
export async function wipeUserData(uid) {
  if (!uid) return;
  await Promise.allSettled([
    removeResume(uid),
    deleteSessionsForUser(uid),
    clearHrSession(uid),
    clearCandidates(),
    clearGeminiCache(),
    purgeHrCloudSessions(),
  ]);
}
