import { useFocusTrap } from "../hooks/useFocusTrap";
import Icon from "./ui/Icon";
import { useAuth } from "../context/AuthContext";
import Button from "./ui/Button";

export default function StudentResumePreviewModal({ isOpen, onClose, profile, score = 85 }) {
  const { user } = useAuth();
  const trapRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  const academic = profile?.academicDetails || {};
  const college = academic.college || "University Institute of Technology";
  const branch = academic.branch || "Computer Science & Engineering";
  const gradYear = academic.gradYear || "2026";
  const cgpa = academic.cgpa || "8.5";
  const readiness = academic.placementStatus || "Placement Ready";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop bg-black/70 backdrop-blur-sm">
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-preview-title"
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[var(--theme-card)] p-6 md:p-8 shadow-2xl modal-card border border-[var(--theme-border)]"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--theme-border)]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-700">
              <Icon name="bolt" className="h-3.5 w-3.5 inline-block -mt-0.5 mr-1" />Readiness Score: {score}% ({readiness})
            </span>
            <h2 id="resume-preview-title" className="mt-2 text-xl font-extrabold text-[var(--theme-text)]">
              Student Academic Profile &amp; Resume Preview
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded-xl border border-[var(--theme-border)] p-2 text-[var(--theme-text-muted)] hover:bg-[#0B1F3A]/[0.06] hover:text-[var(--theme-text)] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Printable Resume Mockup Document */}
        <div className="mt-6 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)]/4 p-6 md:p-8 space-y-6 shadow-inner text-[var(--theme-text)]">
          {/* Resume Title Header */}
          <div className="border-b border-[var(--theme-border)] pb-4">
            <h1 className="text-2xl font-black text-[var(--theme-text)] tracking-tight">
              {profile?.displayName || user?.displayName || "Student Candidate"}
            </h1>
            <p className="text-sm font-semibold text-[var(--theme-text-muted)] mt-1">
              {user?.email} &bull; {college}
            </p>
          </div>

          {/* Education Section */}
          <div>
            <h3 className="text-xs font-black tracking-wider uppercase text-[var(--theme-text-muted)] mb-2">
              Education &amp; Academic Credentials
            </h3>
            <div className="rounded-xl bg-[var(--theme-card)] p-4 border border-[var(--theme-border)] shadow-2xs space-y-1">
              <div className="flex justify-between items-center text-sm font-bold text-[var(--theme-text)]">
                <span>{college}</span>
                <span className="text-xs text-[var(--theme-text-muted)]">Graduating: {gradYear}</span>
              </div>
              <p className="text-xs text-[var(--theme-text-muted)] font-medium">
                Branch: {branch} &bull; CGPA: <span className="font-extrabold text-emerald-700">{cgpa}</span> / 10
              </p>
            </div>
          </div>

          {/* Target Role & Skills Section */}
          <div>
            <h3 className="text-xs font-black tracking-wider uppercase text-[var(--theme-text-muted)] mb-2">
              Extracted Technical Skills &amp; DSA Competencies
            </h3>
            <div className="flex flex-wrap gap-2">
              {["Data Structures", "Algorithms", "React.js", "Node.js", "Python", "SQL", "Git", "System Design"].map(
                (skill) => (
                  <span
                    key={skill}
                    className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-1 text-xs font-extrabold text-[var(--theme-text-muted)] shadow-2xs"
                  >
                    {skill}
                  </span>
                )
              )}
            </div>
          </div>

          {/* System AI Evaluation Summary */}
          <div className="rounded-xl bg-blue-500/12 border border-blue-500/30 p-4 text-xs font-medium text-blue-700 space-y-1">
            <span className="font-black text-blue-950 flex items-center gap-1.5">
              <Icon name="bot" className="h-3.5 w-3.5 inline-block -mt-0.5 mr-1" />Skill-Set AI Verification Tag
            </span>
            <p>
              Verified against current campus placement cutoffs (Min CGPA: 7.5). Strong proficiency detected in Core Data Structures and Problem Solving.
            </p>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[var(--theme-border)]">
          <Button type="button" variant="secondary" onClick={onClose} className="px-4 py-2 text-xs font-extrabold">
            Close
          </Button>
          <Button type="button" onClick={handlePrint} className="px-5 py-2 text-xs font-black">
            <Icon name="print" className="h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
