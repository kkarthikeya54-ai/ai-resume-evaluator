import { removeResume } from "./resumeStorage";
import { clearSession as clearHrSession, clearCandidates } from "./hrStore";
import { deleteSessionsForUser } from "./sessionStore";
import { clearGeminiCache } from "./gemini";

export async function wipeUserData(uid) {
  if (!uid) return;
  await Promise.allSettled([
    removeResume(uid),
    deleteSessionsForUser(uid),
    clearHrSession(uid),
    clearCandidates(),
    clearGeminiCache(),
  ]);
}
