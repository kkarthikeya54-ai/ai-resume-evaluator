/**
 * Persistent Tesseract worker pool.
 *
 * The old path created a fresh Tesseract worker (downloading/initialising
 * the engine + language data) for EVERY scanned file and terminated it
 * afterwards — the dominant cost when reading scanned/image resumes. This
 * pool boots 1-2 workers lazily on first OCR use, keeps them alive for the
 * whole page session, and hands them out with a tiny queue. Subsequent
 * recognitions reuse the warm engine, so per-file OCR drops from seconds
 * of startup + recognition to just recognition.
 *
 * Worker count is deliberately small (OCR workers are CPU-heavy) and
 * scales to 2 only on >=4 logical cores. Everything is lazy: importing
 * this module downloads nothing until the first OCR actually runs.
 */

let poolPromise = null;
const free = [];
const waiters = [];

function poolSize() {
  const cores = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4;
  return cores >= 4 ? 2 : 1;
}

function bootPool() {
  if (!poolPromise) {
    poolPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const workers = [];
      // Created sequentially — parallel boots contend for the same
      // language-data download and end up slower.
      for (let i = 0; i < poolSize(); i += 1) {
        const worker = await createWorker(["eng"]);
        workers.push(worker);
      }
      free.push(...workers);
      waiters.splice(0).forEach((wake) => wake());
      return workers;
    })().catch((err) => {
      // Allow a later retry if boot failed (e.g. offline CDN fetch).
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

/**
 * Fire-and-forget boot for pre-warming (e.g. when a bulk upload starts).
 * Resolves once at least one worker is ready; safe to call many times.
 */
export function ensureOcrPool() {
  return bootPool();
}

/**
 * Run `fn(worker)` on a pooled worker, waiting for a free one if needed.
 * The worker is returned to the pool even when fn throws.
 */
export async function withOcrWorker(fn) {
  await bootPool();
  while (free.length === 0) {
    await new Promise((resolve) => waiters.push(resolve));
  }
  const worker = free.pop();
  try {
    return await fn(worker);
  } finally {
    free.push(worker);
    const wake = waiters.shift();
    if (wake) wake();
  }
}

/** OCR an image-like source (File/Blob/canvas) using the warm pool. */
export async function ocrImagePooled(imageSource) {
  const { data } = await withOcrWorker((worker) => worker.recognize(imageSource));
  return (data.text || "").trim();
}

/** Test/teardown helper: terminate all pooled workers. */
export async function terminateOcrPool() {
  const workers = poolPromise ? await bootPool().catch(() => []) : [];
  await Promise.allSettled(workers.map((w) => w.terminate()));
  free.length = 0;
  poolPromise = null;
}
