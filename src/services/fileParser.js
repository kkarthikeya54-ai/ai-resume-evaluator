import "./pdfjsCompat"; // ES2026 shims required by pdfjs-dist 6
import { isSparse, ocrImage } from "./ocr";

export const SUPPORTED_EXTENSIONS = [
  "pdf",
  "docx",
  "txt",
  "md",
  "rtf",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "bmp",
  "gif",
];

const TEXT_EXTENSIONS = ["txt", "md", "rtf", "csv"];
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "bmp", "gif"];

export function getFileExtension(fileName) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName || "");
  return match ? match[1].toLowerCase() : "";
}

export function isSupportedFile(file) {
  return SUPPORTED_EXTENSIONS.includes(getFileExtension(file?.name || ""));
}

const MAGIC_SIGNATURES = [
  { ext: "pdf", magic: [0x25, 0x50, 0x44, 0x46], offset: 0 },
  { ext: "docx", magic: [0x50, 0x4b], offset: 0 },
  { ext: "png", magic: [0x89, 0x50, 0x4e, 0x47], offset: 0 },
  { ext: "jpg", magic: [0xff, 0xd8, 0xff], offset: 0 },
  { ext: "jpeg", magic: [0xff, 0xd8, 0xff], offset: 0 },
  { ext: "gif", magic: [0x47, 0x49, 0x46, 0x38], offset: 0 },
  { ext: "bmp", magic: [0x42, 0x4d], offset: 0 },
  { ext: "webp", magic: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  { ext: "rtf", magic: [0x7b, 0x5c, 0x72, 0x74, 0x66], offset: 0 },
];

function matchMagicBytes(header, signature) {
  for (let i = 0; i < signature.magic.length; i++) {
    if (header[signature.offset + i] !== signature.magic[i]) return false;
  }
  return true;
}

export async function validateFileBytes(file) {
  const ext = getFileExtension(file?.name);
  const signature = MAGIC_SIGNATURES.find((s) => s.ext === ext);
  if (!signature) return { valid: true, error: null };

  const slice = file.slice(0, 16);
  const header = new Uint8Array(await slice.arrayBuffer());

  if (!matchMagicBytes(header, signature)) {
    const expected = ext === "docx" ? "DOCX (ZIP)" : ext.toUpperCase();
    return {
      valid: false,
      error: `File content does not match .${ext} format. Expected an ${expected} file but the file signature does not match.`,
    };
  }

  return { valid: true, error: null };
}

let pdfjsPromise = null;

function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      return pdfjsLib;
    });
  }
  return pdfjsPromise;
}

export async function extractTextFromPdf(file, { fallbackToOcr = true } = {}) {
  const pdfjsLib = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let text = "";
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    text += `\n--- Page ${pageNumber} ---\n${pageText}`;
  }

  text = text.trim();

  if (fallbackToOcr && isSparse(text)) {
    const ocrText = await ocrPdf(pdf);
    if (!isSparse(ocrText)) return ocrText;
  }

  return text;
}

const OCR_RENDER_SCALE = 1.5;

/* Scanned pages are rasterized at 1.5x (down from 2x) and OCRed in
   parallel through the persistent worker pool — page renders overlap with
   recognition, and the warm engine skips the per-file Tesseract startup
   that used to dominate scanned-file reads. */
async function ocrPdf(pdf) {
  const { ocrPdfPage } = await import("./ocr");
  const pageNumbers = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
  const texts = await Promise.all(
    pageNumbers.map((pageNumber) => ocrPdfPage(pdf, pageNumber, { scale: OCR_RENDER_SCALE }).catch(() => ""))
  );
  return texts.map((text, i) => `\n--- Page ${i + 1} ---\n${text}`).join("").trim();
}

export async function extractTextFromDocx(file) {
  const mod = await import("mammoth");
  const mammoth = mod.default || mod;
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer, buffer: arrayBuffer });
  return (result.value || "").trim();
}

function stripRtf(rtf) {
  return rtf
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\tab/g, " ")
    .replace(/\\'[0-9a-fA-F]{2}/g, "")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, " ")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractTextFromTxt(file) {
  const text = await file.text();
  return text.trim();
}

export async function extractTextFromImage(file) {
  const text = await ocrImage(file);
  return text;
}

export async function extractText(file) {
  const ext = getFileExtension(file?.name);

  if (ext === "pdf") {
    return extractTextFromPdf(file);
  }
  if (ext === "docx") {
    return extractTextFromDocx(file);
  }
  if (ext === "rtf") {
    const text = await extractTextFromTxt(file);
    return stripRtf(text);
  }
  if (TEXT_EXTENSIONS.includes(ext)) {
    return extractTextFromTxt(file);
  }
  if (IMAGE_EXTENSIONS.includes(ext)) {
    return extractTextFromImage(file);
  }

  // Unknown type: fall back to reading as plain text so nothing hard-fails.
  try {
    return extractTextFromTxt(file);
  } catch {
    throw new Error(`Unsupported file type ".${ext}". Use PDF, DOCX, TXT, or an image.`);
  }
}

export { isSparse };

const RESUME_KEYWORDS = [
  "education",
  "experience",
  "skills",
  "projects",
  "summary",
  "objective",
  "contact",
  "employment",
  "work history",
  "technical skills",
  "certifications",
  "awards",
  "publications",
  "references",
  "profile",
  "career",
  "qualification",
  "degree",
  "university",
  "college",
  "company",
  "position",
  "responsibilities",
  "achievements",
  "internship",
  "bachelor",
  "master",
  "phd",
  "gpa",
  "graduated",
];

export function looksLikeResume(text) {
  if (!text || text.length < 20) {
    return { isLikelyResume: false, confidence: 0, matchedSections: [], reason: "File too short to contain meaningful content." };
  }

  const lower = text.toLowerCase();
  const matched = RESUME_KEYWORDS.filter((kw) => lower.includes(kw));
  const ratio = matched.length / RESUME_KEYWORDS.length;

  let isLikelyResume;
  let reason;

  if (matched.length >= 4) {
    isLikelyResume = true;
    reason = null;
  } else if (matched.length >= 2) {
    isLikelyResume = false;
    reason = `Found only ${matched.length} resume-like section(s) (${matched.join(", ")}). This may not be a resume.`;
  } else {
    isLikelyResume = false;
    reason = "No common resume sections found. This does not appear to be a resume.";
  }

  return {
    isLikelyResume,
    confidence: Math.min(Math.round(ratio * 100), 100),
    matchedSections: matched,
    reason,
  };
}
