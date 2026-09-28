export default function UploadProgress({ progress, fileName }) {
  const isDone = progress >= 100;

  return (
    <div className="rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 shadow-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-[var(--theme-text,#0f172a)]">
          {isDone ? "Finalizing" : "Uploading"}
        </span>
        <span className="text-sm font-extrabold text-primary-600">{progress}%</span>
      </div>

      {fileName && (
        <p className="mb-3 truncate text-xs font-semibold text-[var(--theme-text-muted,#64748b)]">{fileName}</p>
      )}

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--theme-bg)]/85 border border-[var(--theme-border,#e2e8f0)]">
        <div
          className={`relative h-full rounded-full bg-primary-600 transition-all duration-300 ease-out ${
            !isDone ? "progress-shimmer" : ""
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-xs font-medium text-[var(--theme-text-muted,#64748b)]">
        {isDone
          ? "Almost there — verifying your file..."
          : progress < 30
            ? "Starting upload..."
            : "Transferring your file securely..."}
      </p>
    </div>
  );
}
