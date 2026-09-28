import { ocrImagePooled, withOcrWorker } from "./ocrWorkerPool";

const MIN_TEXT_LENGTH = 40;

export function isSparse(text) {
  return !text || text.replace(/\s+/g, "").length < MIN_TEXT_LENGTH;
}

/**
 * Pre-warm the OCR pool (language data download + engine init) without
 * blocking. Call this when a bulk upload begins so the first scanned file
 * doesn't pay the startup cost. Safe to call repeatedly; failures are
 * swallowed — the pool boots lazily on demand anyway.
 */
export function warmOcrPool() {
  import("./ocrWorkerPool")
    .then(({ ensureOcrPool }) => ensureOcrPool?.())
    .catch(() => {
      // lazy boot will retry on first real OCR use
    });
}

export async function ocrImage(imageSource) {
  return ocrImagePooled(imageSource);
}

/**
 * Rasterize one PDF page at `scale` and OCR it on a pooled worker.
 * The rendered canvas is reused via the provided pool slot.
 */
export async function ocrPdfPage(pdf, pageNumber, { scale = 1.5 } = {}) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  await page.render({ canvasContext: context, viewport }).promise;
  const { data } = await withOcrWorker((worker) => worker.recognize(canvas));
  return (data.text || "").trim();
}

export async function ocrFile(file) {
  return ocrImage(file);
}
