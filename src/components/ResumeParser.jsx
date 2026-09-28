import { useEffect } from "react";
import { useGemini } from "../hooks/useGemini";
import { subscribeToRun } from "../utils/analysisEvents";

export default function ResumeParser({ resumeText, onResumeTextChange, onUpload }) {
  const { loading, error, data, execute } = useGemini();

  useEffect(
    () => subscribeToRun((text) => text && execute("parseResume", text)),
    [execute]
  );

  const handleParse = () => {
    execute("parseResume", resumeText);
  };

  return (
    <section id="summary" className="rounded-3xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 sm:p-8 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 className="text-xl font-extrabold text-[var(--theme-text,#0f172a)]">Parse Your Resume</h2>
        <button
          onClick={onUpload}
          className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-4 py-2 text-sm font-bold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-card,#ffffff)] shadow-2xs transition-all cursor-pointer"
        >
          Upload Resume File
        </button>
      </div>
      <p className="text-sm text-[var(--theme-text-muted,#64748b)] font-medium mb-4">
        Upload your resume file or paste its content below. AI extracts name, contact, skills,
        experience, education, and projects.
      </p>
      <textarea
        rows={10}
        className="w-full rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 p-4 text-sm text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] resize-y focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 shadow-xs transition-all font-mono"
        placeholder="Paste your resume content here..."
        value={resumeText}
        onChange={(e) => onResumeTextChange(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          onClick={handleParse}
          disabled={loading || !resumeText}
          className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer active:scale-95"
        >
          {loading ? "Parsing..." : "Parse Resume"}
        </button>
        <span className="text-xs font-semibold text-[var(--theme-text-muted,#64748b)]">{resumeText.length} characters</span>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {data && (
        <div className="mt-8 rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 space-y-8 shadow-xs">
          <div>
            <h3 className="text-lg font-extrabold text-[var(--theme-text,#0f172a)] mb-4">Candidate Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Name", value: data.name },
                { label: "Email", value: data.email },
                { label: "Phone", value: data.phone },
                { label: "Location", value: data.location },
                { label: "LinkedIn", value: data.linkedin },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 p-3">
                  <div className="text-xs font-bold text-primary-600 uppercase mb-1">{item.label}</div>
                  <div className="text-sm font-semibold text-[var(--theme-text,#0f172a)] break-all">{item.value || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          {data.summary && (
            <div>
              <h3 className="text-sm font-bold text-[var(--theme-text,#0f172a)] mb-2">Summary</h3>
              <p className="text-sm text-[var(--theme-text-muted,#64748b)] leading-relaxed font-medium">{data.summary}</p>
            </div>
          )}

          {data.skills?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[var(--theme-text,#0f172a)] mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {data.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold text-primary-600"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.experience?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[var(--theme-text,#0f172a)] mb-3">Experience</h3>
              <div className="space-y-3">
                {data.experience.map((exp, i) => (
                  <div key={i} className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
                      <span className="text-sm font-bold text-[var(--theme-text,#0f172a)]">{exp.role}</span>
                      <span className="text-xs font-semibold text-[var(--theme-text-muted,#64748b)]">{exp.duration}</span>
                    </div>
                    <div className="text-xs font-bold text-primary-600 mb-2">{exp.company}</div>
                    <ul className="space-y-1">
                      {exp.highlights?.map((h, j) => (
                        <li key={j} className="text-xs text-[var(--theme-text-muted,#64748b)] flex items-start gap-1.5 font-medium">
                          <span className="text-primary-600 font-bold mt-0.5">&#8594;</span> {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.education?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[var(--theme-text,#0f172a)] mb-3">Education</h3>
              <div className="space-y-3">
                {data.education.map((edu, i) => (
                  <div key={i} className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 p-4">
                    <div className="text-sm font-bold text-[var(--theme-text,#0f172a)]">{edu.degree}</div>
                    <div className="text-xs font-bold text-primary-600">{edu.institution}</div>
                    <div className="text-xs text-[var(--theme-text-muted,#64748b)] font-medium mt-1">{edu.year}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.projects?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[var(--theme-text,#0f172a)] mb-3">Projects</h3>
              <div className="space-y-3">
                {data.projects.map((proj, i) => (
                  <div key={i} className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 p-4">
                    <div className="text-sm font-bold text-[var(--theme-text,#0f172a)] mb-1">{proj.name}</div>
                    <p className="text-xs text-[var(--theme-text-muted,#64748b)] font-medium mb-2">{proj.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {proj.technologies?.map((tech, j) => (
                        <span key={j} className="rounded-md border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-2 py-0.5 text-xs font-semibold text-[var(--theme-text,#0f172a)]">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.certifications?.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[var(--theme-text,#0f172a)] mb-3">Certifications</h3>
              <ul className="space-y-1">
                {data.certifications.map((cert, i) => (
                  <li key={i} className="text-sm text-[var(--theme-text-muted,#64748b)] font-medium">&#8226; {cert}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
