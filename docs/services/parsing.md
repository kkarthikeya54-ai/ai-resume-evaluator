# Parsing

> ⚙️ Services · Prev: [Auth & Role](./auth-and-role.md) · Next: [AI Gateway](./ai-gateway.md)

All parsing happens **in the browser** — the heart of the local-first privacy story.

## `fileParser.js`

| Export | Purpose |
| --- | --- |
| `SUPPORTED_EXTENSIONS` | pdf, docx, txt, md, rtf, csv + 6 image formats |
| `getFileExtension(name)` | Robust lowercase extension extraction |
| `isSupportedFile(file)` | Dropzone gate |
| `validateFileBytes(file)` | **Magic-byte validation** — reads the first 16 bytes and compares against a signature table: PDF `%PDF` (25 50 44 46), DOCX `PK` zip, PNG/JPEG/GIF/BMP/WebP(RIFF), RTF `{\rtf`. Rejects renamed files with a precise, user-facing error |
| `extractText(file)` | Dispatcher by extension (below) |
| `extractTextFromPdf(file, {fallbackToOcr})` | pdf.js extraction (below) |
| `extractTextFromDocx(file)` | mammoth `extractRawText` |
| `extractTextFromTxt(file)` | `file.text()` |
| `extractTextFromImage(file)` | tesseract OCR (eng) |
| `looksLikeResume(text)` | Heuristic sanity check (below) |
| `stripRtf` (internal) | Regex control-word stripper for RTF |

### `extractText` dispatch

```
pdf   → extractTextFromPdf  (text layer; sparse? → OCR pages at 2× scale)
docx  → mammoth extractRawText
rtf   → file.text() → stripRtf
txt/md/csv → file.text()
image → ocrImage (tesseract)
unknown → best-effort plain text (never hard-fails)
```

### PDF extraction details

1. Lazy-loads `pdfjs-dist` (single cached promise) and sets `GlobalWorkerOptions.workerSrc` from a bundled URL.
2. `getDocument({data: arrayBuffer})` → per page: `getTextContent()` → items joined with `--- Page N ---` separators.
3. `isSparse(text)` (< 40 non-whitespace chars) and OCR fallback on → renders each page to canvas at 2× and OCRs it with tesseract.js (worker terminated in `finally`).

### `looksLikeResume` heuristic

Matches 30 resume keywords (education/experience/skills/projects/certifications/…):
- **≥ 4 matches** → confident resume (no warning)
- **2–3 matches** → soft warning: "This may not be a resume" (user can proceed)
- **else** → "No common resume sections found"

Returns `{isLikelyResume, confidence, matchedSections, reason}` — used by UploadPage.

## `pdfjsCompat.js` — the ES2026 shims (load-bearing!)

pdfjs-dist 6 calls three standard-library methods browsers don't ship yet:
`Map.prototype.getOrInsertComputed` (33 uses), `Map.prototype.getOrInsert`, `Uint8Array.prototype.toHex` (plus `fromHex`).

- **Main realm:** this module is imported for side effects at the top of `fileParser.js`.
- **Worker realm:** the vite plugin prepends the same shims to the worker — dev middleware + build-time asset patch (see [Reference → Tech Stack](../reference/tech-stack.md#build-pipeline-notes)).

Without this, **every PDF parse fails** on current browsers with `toHex is not a function`. Verified: real text extraction works end-to-end with the shims; removing them breaks parsing immediately.

## `ocr.js`

- `isSparse(text)` — the OCR trigger threshold.
- `ocrImage(imageSource)` / `ocrFile(file)` — tesseract worker lifecycle: `createWorker(["eng"])` → `recognize` → `terminate` in `finally`.

---

**Related pages:** [AI Gateway](./ai-gateway.md) (what happens to the extracted text) · [HR Pipeline](./hr-pipeline.md) (batch extraction) · [Reference → Tech Stack](../reference/tech-stack.md) (pdfjs build patch)
