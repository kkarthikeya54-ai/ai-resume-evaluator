import { useNavigate } from "react-router-dom";
import Icon from "../ui/Icon";
import TiltCard3D from "../ui/TiltCard3D";
import TugOfWar from "../ui/TugOfWar";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const DIMENSIONS = [
  { key: "skills", label: "Skills" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "projects", label: "Projects" },
  { key: "keywordMatch", label: "Keyword Match" },
];

function scoreValue(candidate, key) {
  return candidate.scores?.[key] ?? candidate.scores?.overall ?? 0;
}

function scoreColor(value, best) {
  if (value === best && best > 0) return "text-primary-600 font-extrabold";
  if (value >= 75) return "text-primary-600 font-bold";
  if (value >= 50) return "text-shortlist-700 font-bold";
  return "text-red-600 font-bold";
}

function CompareRow({ label, candidates, bestByKey }) {
  return (
    <tr className="border-b border-[var(--theme-border)] last:border-0 hover:bg-[var(--theme-card)]/6 transition-colors">
      <td className="px-4 py-3.5 text-xs sm:text-sm font-extrabold text-[var(--theme-text)] whitespace-nowrap">{label}</td>
      {candidates.map((candidate) => {
        const value = scoreValue(candidate, bestByKey.key);
        const isBest = value === bestByKey.best && bestByKey.best > 0;
        return (
          <td key={candidate.id} className="px-4 py-3.5">
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-black font-mono ${scoreColor(value, bestByKey.best)} ${isBest ? "bg-emerald-500/10 border border-emerald-500/40 px-2 py-0.5 rounded-lg shadow-2xs text-emerald-700" : ""}`}>
                {value}%
              </span>
              {isBest && (
                <span className="text-[11px] font-black text-emerald-700 bg-emerald-500/15 px-1.5 py-0.2 rounded-md">
                  <Icon name="crown" className="h-3 w-3 inline-block -mt-0.5" /> TOP
                </span>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

function ListCell({ items, tone }) {
  const list = items || [];
  if (!list.length) return <span className="text-xs text-[var(--theme-text-muted)] font-medium">—</span>;
  return (
    <ul className="space-y-1.5">
      {list.slice(0, 4).map((item, i) => (
        <li
          key={i}
          className={`text-xs leading-snug font-medium flex items-start gap-1.5 ${tone === "missing" ? "text-red-700" : "text-[var(--theme-text-muted)]"}`}
        >
          <span className={tone === "missing" ? "text-red-500 font-bold" : "text-emerald-600 font-bold"}>
            {tone === "missing" ? "✕" : "✓"}
          </span>
          <span>{item}</span>
        </li>
      ))}
      {list.length > 4 && <li className="text-[12px] text-[var(--theme-text-muted)] font-bold">+{list.length - 4} more</li>}
    </ul>
  );
}

export default function CompareModal({ candidates, sessionId, onClose }) {
  const navigate = useNavigate();
  const trapRef = useFocusTrap(Boolean(candidates?.length), onClose);

  if (!candidates?.length) return null;

  const bests = {};
  for (const dim of DIMENSIONS) {
    bests[dim.key] = Math.max(...candidates.map((c) => scoreValue(c, dim.key)));
  }
  const overallBest = Math.max(
    ...candidates.map((c) => c.scores?.total ?? c.scores?.overall ?? 0)
  );

  const handleExportCSV = () => {
    const headers = ["Candidate", "Rank", "Overall Score %", ...DIMENSIONS.map((d) => d.label), "Matched Keywords", "Strengths"];
    const rows = candidates.map((c) => {
      const name = `"${(c.evaluation?.name || c.fileName).replace(/"/g, '""')}"`;
      const rank = c.rank ?? "";
      const overall = c.scores?.total ?? c.scores?.overall ?? 0;
      const dimScores = DIMENSIONS.map((d) => scoreValue(c, d.key));
      const matched = `"${(c.evaluation?.matchedKeywords || []).join("; ").replace(/"/g, '""')}"`;
      const strengths = `"${(c.evaluation?.strengths || []).join("; ").replace(/"/g, '""')}"`;
      return [name, rank, overall, ...dimScores, matched, strengths].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `candidate_comparison_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-modal-title"
        className="modal-card w-full max-w-5xl rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 sm:p-8 shadow-2xl my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[var(--theme-border)]">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-black text-primary-700 mb-1.5">
              <span className="inline-flex items-center gap-1.5"><Icon name="chart" className="h-4 w-4" />Side-by-Side Benchmark</span>
            </div>
            <h2 id="compare-modal-title" className="text-xl sm:text-2xl font-black tracking-tight text-[var(--theme-text)]">
              Candidate Comparison Matrix
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[var(--theme-text-muted)] font-medium">
              Comparing {candidates.length} candidates across standardized evaluation criteria.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-black text-white hover:bg-primary-700 active:scale-95 shadow-2xs transition-all cursor-pointer"
            >
              <Icon name="download" className="h-4 w-4" /> Export Comparison CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-2 text-xs font-bold text-[var(--theme-text-muted)] hover:bg-[#0B1F3A]/[0.04] active:scale-95 shadow-2xs transition-all cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-8">
          {/* Comparison Matrix Table */}
          <div className="overflow-x-auto rounded-2xl border border-[var(--theme-border)] shadow-2xs">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-card)]/8">
                  <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-[var(--theme-text-muted)] w-44">
                    Dimension
                  </th>
                  {candidates.map((candidate) => {
                    const overall = candidate.scores?.total ?? candidate.scores?.overall ?? 0;
                    const isWinner = overall === overallBest && overall > 0;
                    return (
                      <th key={candidate.id} className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-[var(--theme-text)] whitespace-nowrap">
                            {candidate.evaluation?.name || candidate.fileName}
                          </span>
                          {isWinner && <span title="Highest Overall Match" className="inline-flex text-shortlist-700"><Icon name="crown" className="h-4 w-4" /></span>}
                        </div>
                        <div className="text-[12px] text-[var(--theme-text-muted)] font-bold mt-0.5">#{candidate.rank} Rank</div>
                        <div className={`text-base font-black mt-1 font-mono ${isWinner ? "text-emerald-700" : "text-[var(--theme-text)]"}`}>
                          {overall}% Match
                        </div>
                        {sessionId && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose?.();
                              navigate(`/candidate/${candidate.id}?session=${sessionId}`);
                            }}
                            className="mt-1.5 inline-block text-left text-xs font-bold text-primary-700 hover:underline cursor-pointer"
                          >
                            Open Profile &rarr;
                          </button>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border)]">
                {DIMENSIONS.map((dim) => (
                  <CompareRow
                    key={dim.key}
                    label={dim.label}
                    candidates={candidates}
                    bestByKey={{ key: dim.key, best: bests[dim.key] }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Head-to-head duel bars (exact pair) */}
          {candidates.length === 2 && (
          <div className="stagger-item rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)]/60 p-5 sm:p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--theme-text-muted)] mb-4">
              Head-to-Head Duel
            </h3>
            <div className="space-y-4 max-w-2xl mx-auto">
              {DIMENSIONS.map((dim) => {
                const [left, right] = candidates;
                return (
                  <TugOfWar
                    key={dim.key}
                    left={{ label: left.evaluation?.name || left.fileName, value: scoreValue(left, dim.key) }}
                    right={{ label: right.evaluation?.name || right.fileName, value: scoreValue(right, dim.key) }}
                  />
                );
              })}
              <TugOfWar
                left={{
                  label: candidates[0].evaluation?.name || candidates[0].fileName,
                  value: candidates[0].scores?.total ?? candidates[0].scores?.overall ?? 0,
                }}
                right={{
                  label: candidates[1].evaluation?.name || candidates[1].fileName,
                  value: candidates[1].scores?.total ?? candidates[1].scores?.overall ?? 0,
                }}
              />
            </div>
          </div>
          )}

          {/* 3D Tilt Deep Dive Candidate Cards */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--theme-text-muted)] mb-3">
              Qualitative Assessment Highlights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((candidate) => {
                const evaluation = candidate.evaluation || {};
                const overall = candidate.scores?.total ?? candidate.scores?.overall ?? 0;
                const isWinner = overall === overallBest && overall > 0;
                return (
                  <TiltCard3D
                    key={candidate.id}
                    maxTilt={5}
                    className={`rounded-2xl border p-5 shadow-2xs transition-all ${
                      isWinner
                        ? "border-emerald-500/40 bg-emerald-500/8"
                        : "border-[var(--theme-border)] bg-[var(--theme-card)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-[var(--theme-text)] truncate">
                          {evaluation.name || candidate.fileName}
                        </h4>
                        <span className="text-[12px] text-[var(--theme-text-muted)] font-medium">#{candidate.rank} Rank</span>
                      </div>
                      <span className={`rounded-xl px-2.5 py-1 text-xs font-black font-mono ${
                        isWinner ? "bg-emerald-600 text-white shadow-2xs" : "bg-[#0B1F3A]/[0.06] text-[var(--theme-text)]"
                      }`}>
                        {overall}%
                      </span>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div>
                        <div className="mb-1 text-[12px] font-black uppercase tracking-wider text-primary-700">
                          Matched Keywords ({evaluation.matchedKeywords?.length || 0})
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(evaluation.matchedKeywords || []).slice(0, 5).map((kw, i) => (
                            <span
                              key={i}
                              className="inline-flex rounded-md border border-primary-200 bg-primary-50 px-2 py-0.5 text-[12px] font-bold text-primary-700"
                            >
                              {kw}
                            </span>
                          ))}
                          {!evaluation.matchedKeywords?.length && <span className="text-[var(--theme-text-muted)]">—</span>}
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 text-[12px] font-black uppercase tracking-wider text-[var(--theme-text-muted)]">
                          Top Strengths
                        </div>
                        <ListCell items={evaluation.strengths} />
                      </div>

                      <div>
                        <div className="mb-1 text-[12px] font-black uppercase tracking-wider text-red-700">
                          Noted Concerns
                        </div>
                        <ListCell items={evaluation.concerns} tone="missing" />
                      </div>
                    </div>
                  </TiltCard3D>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
