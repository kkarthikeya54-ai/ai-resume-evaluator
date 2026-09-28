/**
 * Extracted-text cache for uploaded resumes (local-only, IndexedDB).
 *
 * Parsing (pdfjs text layer + fallback OCR) is the dominant fixed cost when
 * re-running evaluation on the same files — e.g. after editing job criteria,
 * retrying a failed batch, or reloading a session. This cache stores the
 * final extracted text keyed by a strong hash of the file bytes, so identical
 * files are never parsed twice on the same device.
 *
 * Design constraints:
 * - Local-only, consistent with the app's privacy stance: nothing leaves the
 *   device. OCR engines and pdfjs are already local.
 * - Degrades gracefully: every function resolves to a safe fallback when
 *   IndexedDB is unavailable (SSR, tests, private-mode failures).
 * - Size-capped and TTL'd so it cannot grow unbounded (respects the device
 *   storage meter shown in the UI). Purge runs opportunistically, throttled
 *   to once per session.
 */

const DB_NAME = "airesume_extract";
const STORE_NAME = "extracts";
/* v2: a bare `indexedDB.open(DB_NAME)` elsewhere (old tab, probe, extension)
   can create the DB at v1 with no stores; a fixed VERSION would then match and
   `onupgradeneeded` would never fire, silently disabling the cache forever.
   Bumping forces a real upgrade, and the create-guard below re-checks the
   store on every upgrade anyway. */
const VERSION = 2;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ENTRIES = 800; // ~500-file bulk run + headroom; entries are small (text only)

let dbPromise = null;
let purgeQueued = false;

function hasIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb() {
  if (dbPromise) return dbPromise;
  if (!hasIndexedDb()) {
    return Promise.reject(new Error("indexeddb-unavailable"));
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "hash" });
      }
    };
    request.onsuccess = () => {
      // Let the tab upgrade/close the DB cleanly when another tab requests it.
      request.result.onversionchange = () => {
        try {
          request.result.close();
        } catch {
          // ignore
        }
      };
      resolve(request.result);
    };
    request.onerror = () => reject(request.error || new Error("indexeddb-open-failed"));
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

/* ---------- hashing (strong, over raw bytes) ---------- */

function toHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

async function sha256Hex(data) {
  // SubtleCrypto: works in all secure contexts (https + localhost).
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

/** FNV-1a 64-bit over bytes — fallback when crypto.subtle is unavailable. */
function fnv1a64(data) {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < data.length; i += 1) {
    h ^= BigInt(data[i]);
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0") + `_${data.length}`;
}

export async function hashBytes(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) return await sha256Hex(bytes);
  } catch {
    // fall through to fnv
  }
  return fnv1a64(bytes);
}

/* ---------- cache API ---------- */

export async function getExtractedText(hash) {
  if (!hash) return null;
  try {
    const record = await transaction("readonly", (store) => store.get(hash));
    if (!record || typeof record.text !== "string") return null;
    if (record.ts && Date.now() - record.ts > TTL_MS) return null;
    return record.text;
  } catch {
    return null;
  }
}

export async function putExtractedText(hash, text) {
  if (!hash || typeof text !== "string" || text.length === 0) return false;
  try {
    await transaction("readwrite", (store) => store.put({ hash, text, ts: Date.now() }));
    schedulePurge();
    return true;
  } catch {
    return false;
  }
}

/** Purge expired entries, then trim to MAX_ENTRIES (oldest first). Throttled. */
function schedulePurge() {
  if (purgeQueued) return;
  purgeQueued = true;
  setTimeout(() => {
    purgeQueued = false;
    purgeExpired().catch(() => {});
  }, 4000).unref?.();
}

export async function purgeExpired() {
  const all = await transaction("readonly", (store) => store.getAll());
  const records = (all || []).filter((r) => r?.hash);
  const now = Date.now();
  const expired = records.filter((r) => !r.ts || now - r.ts > TTL_MS);
  if (expired.length > 0) {
    await transaction("readwrite", (store) => {
      expired.forEach((r) => store.delete(r.hash));
      return null;
    });
  }
  const survivors = records
    .filter((r) => r.ts && now - r.ts <= TTL_MS)
    .sort((a, b) => a.ts - b.ts);
  const excess = survivors.length - MAX_ENTRIES;
  if (excess > 0) {
    await transaction("readwrite", (store) => {
      survivors.slice(0, excess).forEach((r) => store.delete(r.hash));
      return null;
    });
  }
}

/** Test/teardown helper: drop the entire cache. */
export async function clearExtractCache() {
  try {
    await transaction("readwrite", (store) => store.clear());
    return true;
  } catch {
    return false;
  }
}
