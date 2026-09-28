import { useRef, useState } from "react";
import { isSupportedFile, validateFileBytes, SUPPORTED_EXTENSIONS } from "../../services/fileParser";

const MAX_SIZE = 10 * 1024 * 1024;

function validateFile(file) {
  if (!file) return { valid: false, error: "No file selected." };
  if (!isSupportedFile(file)) {
    return {
      valid: false,
      error: `Unsupported type. Use ${SUPPORTED_EXTENSIONS.join(", ")}.`,
    };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: `${file.name} exceeds the 10 MB limit.` };
  }
  return { valid: true, error: null };
}

export default function MultiFileDropzone({ onFilesChange, files }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);

  const addFiles = async (incoming) => {
    if (!incoming?.length) return;
    const accepted = [];
    let firstError = null;
    for (const file of Array.from(incoming)) {
      const result = validateFile(file);
      if (!result.valid) {
        if (!firstError) firstError = result.error;
        continue;
      }
      const bytes = await validateFileBytes(file);
      if (!bytes.valid) {
        if (!firstError) firstError = bytes.error;
        continue;
      }
      accepted.push(file);
    }
    if (firstError) setError(firstError);
    if (accepted.length) {
      setError(null);
      onFilesChange([...files, ...accepted]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload candidate resume files"
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all cursor-pointer focus:outline-none ${
          dragOver
            ? "border-primary-500 bg-primary-50 scale-[1.01]"
            : "border-[var(--theme-border)] bg-[var(--theme-card)] hover:border-primary-300 hover:bg-primary-50/30 focus:border-primary-500 shadow-2xs"
        }`}
      >
        <p className="text-sm font-bold text-[var(--theme-text)]">
          {dragOver ? "Drop resumes here" : "Drag & drop resumes, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-[var(--theme-text-muted)] font-medium">
          You can select many files at once &middot; PDF, DOCX, TXT, images &middot; up to 10 MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.rtf,.csv,.png,.jpg,.jpeg,.webp,.bmp,.gif"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 shadow-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--theme-text)]">
              {files.length} resume{files.length === 1 ? "" : "s"} selected
            </span>
            <button
              type="button"
              onClick={() => onFilesChange([])}
              className="text-xs font-bold text-[var(--theme-text-muted)] hover:text-red-600 transition-colors"
            >
              Clear all
            </button>
          </div>
          <ul className="max-h-56 space-y-1.5 overflow-y-auto">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)]/7 px-3.5 py-2 text-sm"
              >
                <span className="truncate text-[var(--theme-text-muted)] text-xs font-medium">
                  <span className="text-[var(--theme-text)] font-bold text-sm mr-2">{file.name}</span>
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${file.name}`}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-500/10 transition-colors"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
