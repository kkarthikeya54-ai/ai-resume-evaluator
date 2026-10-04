import { clampPassRate } from "./passRate";

const DB_NAME = "airesume_sessions";
const STORE_NAME = "sessions";
const VERSION = 1;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function transaction(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        let result;
        let settled = false;
        const safeReject = (e) => {
          if (!settled) {
            settled = true;
            reject(e);
          }
        };
        let request;
        try {
          request = fn(store);
        } catch (err) {
          settled = true;
          try {
            tx.abort();
          } catch {
            // ignore
          }
          reject(err);
          return;
        }
        if (request && !request.onsuccess) {
          // Only attach a default handler when the caller didn't wire its own
          // (deleteSessionsForUser deletes records inside getAll.onsuccess).
          request.onsuccess = () => {
            result = request.result;
          };
        }
        tx.oncomplete = () => {
          if (!settled) {
            settled = true;
            resolve(result);
          }
        };
        tx.onerror = () => safeReject(tx.error);
        tx.onabort = () => safeReject(tx.error || new Error("Transaction aborted"));
      })
  );
}

function makeId() {
  return `ses_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSessionId() {
  return makeId();
}

export async function listSessions(uid, role) {
  if (!uid) return [];
  try {
    const all = await transaction("readonly", (store) => store.getAll());
    const list = (all || [])
      .filter((record) => record.uid === uid && record.role === role)
      .map((record) => ({
        id: record.id,
        uid: record.uid,
        role: record.role,
        name: record.name || "Untitled Session",
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        interviewDate: record.interviewDate || null,
        passRate: record.passRate != null ? clampPassRate(record.passRate) : null,
        payload: record.payload || {},
      }))
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    return list;
  } catch {
    return [];
  }
}

export async function getSession(id) {
  if (!id) return null;
  try {
    return await transaction("readonly", (store) => store.get(id));
  } catch {
    return null;
  }
}

export async function createSession(uid, role, name, extras = {}) {
  if (!uid) return null;
  const now = new Date().toISOString();
  const record = {
    id: makeId(),
    uid,
    role,
    name: (name || "").trim() || "New Session",
    createdAt: now,
    updatedAt: now,
    payload: {},
  };
  // Optional HR session metadata chosen at creation time: the scheduled
  // interview date (shown on the sessions-page calendar) and the starting
  // pass-rate threshold. Anything else in `extras` is ignored.
  if (extras.interviewDate) record.interviewDate = extras.interviewDate;
  if (extras.passRate != null) record.passRate = clampPassRate(extras.passRate);
  await putSession(record);
  return record;
}

/** Persist HR session metadata (name, interview date, pass rate) without
 *  touching the evaluation payload. Returns the updated record or null.
 *  Clearing a field passes `null` (putSession merges over the stored
 *  record, so an omitted key would keep the old value). */
export async function updateSessionMeta(id, { name, interviewDate, passRate } = {}) {
  const record = await getSession(id);
  if (!record) return null;
  const next = { ...record };
  if (name !== undefined) next.name = (name || "").trim() || record.name;
  if (interviewDate !== undefined) next.interviewDate = interviewDate || null;
  if (passRate !== undefined) {
    next.passRate = passRate != null ? clampPassRate(passRate) : null;
  }
  return putSession(next);
}

export async function putSession(record) {
  if (!record?.id || !record?.uid) return null;
  const now = new Date().toISOString();
  // Merge over the stored record instead of replacing it: most callers
  // (results footer, sample loader, cloud import) write partial records
  // {id, uid, role, name, payload}, and replacing would silently drop the
  // record-level metadata this store now carries (interviewDate, passRate,
  // createdAt). Callers clear a field by writing an explicit null.
  let base = null;
  try {
    base = await transaction("readonly", (store) => store.get(record.id));
  } catch {
    base = null;
  }
  const next = { ...base, ...record, updatedAt: now };
  try {
    await transaction("readwrite", (store) => store.put(next));
    return { ok: true, record: next };
  } catch (err) {
    const isQuota = /quota|exceeded|21|22/i.test(String(err?.name || "") + String(err?.message || ""));
    return { ok: false, error: isQuota ? "quota" : err?.message || "storage_error" };
  }
}

export async function renameSession(id, name) {
  if (!id) return null;
  const record = await getSession(id);
  if (!record) return null;
  return putSession({ ...record, name: (name || "").trim() || record.name });
}

export async function deleteSession(id) {
  if (!id) return;
  try {
    await transaction("readwrite", (store) => store.delete(id));
  } catch {
    // best-effort
  }
}

export async function deleteSessionsForUser(uid) {
  if (!uid) return;
  try {
    await transaction("readwrite", (store) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const all = request.result || [];
        all.filter((record) => record.uid === uid).forEach((record) => store.delete(record.id));
      };
      return request;
    });
  } catch {
    // best-effort
  }
}

export async function getStorageInfo() {
  try {
    if (!navigator.storage?.estimate) return null;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}

export function estimatePayloadBytes(payload = {}) {
  const bytes = [];
  let structured = 0;
  try {
    structured = new TextEncoder().encode(JSON.stringify(payload, (key, value) => (key === "bytes" ? undefined : value))).length;
  } catch {
    structured = 0;
  }
  for (const fd of payload.fileData || []) {
    if (fd?.bytes) bytes.push(fd.bytes.byteLength || fd.bytes.length || 0);
  }
  for (const c of payload.candidates || []) {
    if (c?.resumeText) structured += c.resumeText.length;
    if (c?.url) structured += c.url.length;
  }
  return structured + bytes.reduce((a, b) => a + b, 0);
}

export function formatBytes(bytes) {
  if (!bytes || Number.isNaN(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
