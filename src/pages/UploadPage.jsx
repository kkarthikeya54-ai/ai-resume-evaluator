import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import DashboardHeader from "../components/DashboardHeader";
import FileDropzone from "../components/upload/FileDropzone";
import UploadProgress from "../components/upload/UploadProgress";
import FileInfoCard from "../components/upload/FileInfoCard";
import SuccessAnimation from "../components/upload/SuccessAnimation";
import { SkeletonCard } from "../components/Skeleton";
import { saveResume, saveResumeText } from "../services/resumeStorage";
import { getSession, putSession } from "../services/sessionStore";
import { extractText, looksLikeResume } from "../services/fileParser";

const STAGES = {
  idle: "idle",
  uploading: "uploading",
  ready: "ready",
  analyzing: "analyzing",
  error: "error",
};

export default function UploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const { user } = useAuth();
  const [stage, setStage] = useState(STAGES.idle);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const [resumeWarning, setResumeWarning] = useState(null);

  const uploadFile = async (selected) => {
    setError(null);
    setFile(null);
    setSelectedFile(selected);
    setStage(STAGES.uploading);
    setProgress(0);
    try {
      const record = await saveResume(selected, sessionId ? null : user?.uid, setProgress);
      setFile(record);
      setStage(STAGES.ready);
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
      setStage(STAGES.error);
    }
  };

  const handleFileSelected = (selected) => {
    uploadFile(selected);
  };

  const handleRetry = () => {
    if (selectedFile) {
      uploadFile(selectedFile);
    } else {
      handleReset();
    }
  };

  const handleAnalyze = async () => {
    setStage(STAGES.analyzing);
    setError(null);
    setResumeWarning(null);
    try {
      const resumeText = await extractText(selectedFile);
      const check = looksLikeResume(resumeText);
      if (!check.isLikelyResume) {
        setResumeWarning(check.reason);
      }
      if (sessionId) {
        const record = await getSession(sessionId);
        if (record) {
          await putSession({ ...record, payload: { ...record.payload, resumeText } });
        }
      } else if (user?.uid) {
        try {
          await saveResumeText(user.uid, resumeText);
        } catch {
          toast.error("Could not save this resume to your account. Your analysis still continues, but it may not persist.", {
            duration: 5000,
          });
        }
      }
      navigate(sessionId ? `/app?session=${sessionId}` : "/app", { state: { resumeText } });
    } catch {
      setError("Could not read the file. Please try a different file.");
      setStage(STAGES.ready);
    }
  };

  const handleReset = () => {
    setStage(STAGES.idle);
    setProgress(0);
    setFile(null);
    setSelectedFile(null);
    setError(null);
    setResumeWarning(null);
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg)]/85 text-[var(--theme-text,#0f172a)] pb-12 transition-colors duration-300">
      <DashboardHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <section className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--theme-text,#0f172a)]">Upload Your Resume</h1>
          <p className="text-[var(--theme-text-muted,#64748b)] mt-2 font-medium">
            Get an instant AI placement-readiness score, skill gap breakdown, and personalized roadmap.
          </p>
        </section>

        {stage === STAGES.idle && (
          <FileDropzone onFileSelected={handleFileSelected} disabled={false} />
        )}

        {stage === STAGES.uploading && (
          <div className="space-y-6">
            <UploadProgress progress={progress} fileName={selectedFile?.name} />
            <SkeletonCard lines={4} />
          </div>
        )}

        {stage === STAGES.ready && (
          <div className="space-y-6">
            {resumeWarning && (
              <div className="rounded-2xl border border-shortlist-200 bg-shortlist-50 p-5 shadow-xs">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-shortlist-100 text-shortlist-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-bold text-shortlist-700">This may not be a resume</p>
                    <p className="mt-1 text-sm text-shortlist-700">{resumeWarning}</p>
                    <p className="mt-2 text-xs text-shortlist-600 font-medium">You can still proceed with the analysis.</p>
                  </div>
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 shadow-xs">
              <SuccessAnimation />
              <div className="mt-6 space-y-6">
                <FileInfoCard file={file} />
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAnalyze}
                    className="flex-1 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700 shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    Analyze Resume
                  </button>
                  <button
                    onClick={handleReset}
                    className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-6 py-3 text-sm font-semibold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 shadow-2xs transition-all cursor-pointer active:scale-95"
                  >
                    Upload Another
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {stage === STAGES.analyzing && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-8 text-center shadow-xs">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--theme-border,#e2e8f0)] border-t-primary-600" />
              <p className="mt-4 text-sm font-bold text-[var(--theme-text,#0f172a)]">Preparing your AI analysis</p>
              <p className="mt-1 text-xs font-medium text-[var(--theme-text-muted,#64748b)]">
                Reading {selectedFile?.name || "your resume"} and extracting content...
              </p>
            </div>
            <SkeletonCard lines={5} />
          </div>
        )}

        {stage === STAGES.error && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-bold text-red-700">Upload failed</p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {selectedFile && (
                <button
                  onClick={handleRetry}
                  className="flex-1 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700 shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  Retry Upload
                </button>
              )}
              <button
                onClick={handleReset}
                className="flex-1 rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-6 py-3 text-sm font-semibold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 shadow-2xs transition-all cursor-pointer active:scale-95"
              >
                Choose Different File
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
