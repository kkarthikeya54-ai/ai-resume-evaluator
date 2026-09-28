import { getAuth } from "firebase/auth";
import { auth } from "../config/firebase";
import { generateCandidatesCsv } from "./hrScoring";

/**
 * Cloud backend for HR sessions — served by the free-tier Cloudflare Worker
 * (`worker/hr-api.js`, deployed at https://hr-api.kkarthikeya54.workers.dev).
 *
 * This replaces the previous Firebase Cloud Functions backend, which can no
 * longer be deployed (Firebase now requires the Blaze plan for Cloud
 * Functions) and whose stale deployment rejected cross-origin calls.
 *
 * Auth: the Firebase ID token is forwarded as `Authorization: Bearer`; the
 * worker verifies it server-side and scopes every KV key to the caller's UID.
 * CORS is handled correctly on the worker, so PUT/PATCH preflights succeed.
 */

const HR_API_BASE = "https://hr-api.kkarthikeya54.workers.dev";

export function functionsEnabled() {
  return Boolean(HR_API_BASE && auth);
}

async function getToken() {
  const fbAuth = auth || getAuth();
  const user = fbAuth.currentUser;
  if (!user) throw new Error("Not authenticated.");
  return user.getIdToken();
}

async function request(path, { method = "GET", body } = {}) {
  if (!functionsEnabled()) {
    throw new Error("HR cloud backend is not configured.");
  }
  const token = await getToken();
  const headers = {
    "Authorization": `Bearer ${token}`,
  };
  const url = `${HR_API_BASE}${path}`;
  const options = { method, headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const resp = await fetch(url, options);
  if (!resp.ok) {
    let message = `Request failed (${resp.status})`;
    try {
      const data = await resp.json();
      if (data?.error) message = data.error;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }
  return resp;
}

/**
 * Raw uploaded-file bytes and device-only blob: URLs never belong in the
 * cloud mirror. A 500-resume session carries ~40 MB of file bytes — past
 * the Workers KV 25 MB value limit — and blob: URLs are unusable on any
 * other device. File metadata and candidate resumeText are kept, so the
 * cross-device report view still works (bytes are simply absent there).
 */
function slimPayloadForCloud(payload) {
  if (!payload || typeof payload !== "object") return payload;
  return {
    ...payload,
    fileData: Array.isArray(payload.fileData)
      ? payload.fileData.map(({ bytes, ...meta }) => meta)
      : payload.fileData,
    candidates: Array.isArray(payload.candidates)
      ? payload.candidates.map(({ url, ...rest }) => rest)
      : payload.candidates,
  };
}

export async function saveHrSession({ id, name, role = "hr", payload }) {
  const resp = await request(`/session/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: { name, role, payload: slimPayloadForCloud(payload) },
  });
  return resp.json();
}

export async function fetchHrSession(sessionId) {
  const resp = await request(`/session/${encodeURIComponent(sessionId)}`);
  const data = await resp.json();
  return data?.session || null;
}

export async function listHrSessions() {
  const resp = await request(`/sessions`);
  const data = await resp.json();
  return Array.isArray(data?.sessions) ? data.sessions : [];
}

export async function deleteHrSession(sessionId) {
  const resp = await request(`/session/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
  return resp.json();
}

export async function updateCandidateStatus(sessionId, candidateId, status) {
  const resp = await request(
    `/session/${encodeURIComponent(sessionId)}/candidate/${encodeURIComponent(candidateId)}`,
    { method: "PATCH", body: { status } }
  );
  return resp.json();
}

export async function exportHrSessionCsv(sessionId) {
  // The worker stores full sessions; fetch it and build the CSV client-side
  // (same generator the local Export CSV button already uses).
  const session = await fetchHrSession(sessionId);
  const candidates = Array.isArray(session?.payload?.candidates)
    ? session.payload.candidates
    : [];
  return generateCandidatesCsv(candidates);
}

export async function deleteUserAccount() {
  const resp = await request(`/account/delete`, { method: "POST", body: {} });
  return resp.json();
}
