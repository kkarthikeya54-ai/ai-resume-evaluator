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
        if (request) {
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

export async function createSession(uid, role, name) {
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
  await putSession(record);
  return record;
}

export async function putSession(record) {
  if (!record?.id || !record?.uid) return null;
  const now = new Date().toISOString();
  const next = { ...record, updatedAt: now };
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
