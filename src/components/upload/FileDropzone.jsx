import { useRef, useState } from "react";
import { isSupportedFile, validateFileBytes, SUPPORTED_EXTENSIONS } from "../../services/fileParser";

const MAX_SIZE = 5 * 1024 * 1024;

function validateFile(file) {
  if (!file) return { valid: false, error: "No file selected." };
  if (!isSupportedFile(file)) {
    return {
      valid: false,
      error: `Unsupported file type. Use ${SUPPORTED_EXTENSIONS.join(", ")}.`,
    };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: "File exceeds the 5 MB size limit." };
  }
  return { valid: true, error: null };
}

export default function FileDropzone({ onFileSelected, disabled }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = async (files) => {
    const file = files?.[0];
    const result = validateFile(file);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    const bytes = await validateFileBytes(file);
    if (!bytes.valid) {
      setError(bytes.error);
      return;
    }
    setError(null);
    onFileSelected(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload your resume file"
        className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 sm:px-10 sm:py-24 text-center transition-all ${
          disabled
            ? "border-[var(--theme-border,#e2e8f0)] opacity-50 cursor-not-allowed bg-[var(--theme-card,#ffffff)]"
            : dragOver
              ? "border-primary-500 bg-primary-50 scale-[1.01] cursor-pointer shadow-md"
              : "border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] hover:border-primary-400 hover:bg-primary-50/20 cursor-pointer focus:outline-none focus:border-primary-500 shadow-xs"
        }`}
      >
        <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
          dragOver ? "bg-primary-600 text-white" : "bg-primary-50 text-primary-600 border border-primary-100"
        }`}>
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <p className="text-base font-extrabold text-[var(--theme-text,#0f172a)]">
          {dragOver ? "Drop your resume here" : "Drag & drop your resume"}
        </p>
        <p className="mt-2 text-sm text-[var(--theme-text-muted,#64748b)] font-medium">
          or <span className="text-primary-600 font-bold underline">browse files</span>
        </p>
        <p className="mt-4 text-xs font-semibold text-[var(--theme-text-muted,#64748b)]">
          PDF &middot; DOCX &middot; TXT &middot; Images &middot; up to 5 MB
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,.rtf,.csv,.png,.jpg,.jpeg,.webp,.bmp,.gif"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-sm font-medium text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              setError(null);
              inputRef.current?.click();
            }}
            className="shrink-0 rounded-lg border border-red-500/40 bg-[var(--theme-card)] px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-500/15 transition-colors"
          >
            Choose file
          </button>
        </div>
      )}
    </div>
  );
}
