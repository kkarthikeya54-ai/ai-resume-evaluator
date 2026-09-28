const DB_NAME = "airesume_hr";
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
        request.result.createObjectStore(STORE_NAME, { keyPath: "uid" });
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
        const request = fn(store);
        if (request) {
          request.onsuccess = () => {
            result = request.result;
          };
        }
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export async function loadSession(uid) {
  if (!uid) return null;
  try {
    return await transaction("readonly", (store) => store.get(uid));
  } catch {
    return null;
  }
}

export async function clearSession(uid) {
  if (!uid) return;
  try {
    await transaction("readwrite", (store) => store.delete(uid));
  } catch {
    // best-effort
  }
}

const CANDIDATES_KEY = "airesume_hr_candidates";

export function saveCandidates(candidates) {
  try {
    sessionStorage.setItem(CANDIDATES_KEY, JSON.stringify(candidates || []));
    return true;
  } catch {
    /* Large batches (hundreds of resumes with full extracted text) can
       exceed the ~5 MB sessionStorage quota. Retry without resume text so
       scores/rankings still survive a reload; the full text stays in the
       IndexedDB session record and per-file object URLs. */
    try {
      const slim = (candidates || []).map(({ resumeText, ...rest }) => rest);
      sessionStorage.setItem(CANDIDATES_KEY, JSON.stringify(slim));
      return true;
    } catch {
      // sessionStorage is best-effort
      return false;
    }
  }
}

export function loadCandidates() {
  try {
    const raw = sessionStorage.getItem(CANDIDATES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function clearCandidates() {
  try {
    sessionStorage.removeItem(CANDIDATES_KEY);
  } catch {
    // best-effort
  }
}
