export default function FileInfoCard({ file }) {
  if (!file) return null;

  const uploadedAt = new Date(file.uploadedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const info = [
    { label: "File Name", value: file.name },
    { label: "File Size", value: file.sizeLabel || file.size },
    { label: "Upload Time", value: uploadedAt },
  ];

  return (
    <div className="rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 shadow-xs">
      <h3 className="text-sm font-extrabold text-[var(--theme-text,#0f172a)] mb-4">Uploaded File</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {info.map((item) => (
          <div key={item.label} className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 p-3">
            <div className="text-xs font-bold text-[var(--theme-text-muted,#64748b)] uppercase mb-1">{item.label}</div>
            <div className="text-sm font-semibold text-[var(--theme-text,#0f172a)] break-all">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
