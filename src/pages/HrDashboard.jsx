import { useEffect, useRef, useState } from "react";
import Icon from "../components/ui/Icon";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Seo from "../components/Seo";
import { ROLES } from "../services/role";
import DashboardHeader from "../components/DashboardHeader";
import SessionBar from "../components/SessionBar";
import HrConfigForm from "../components/hr/HrConfigForm";
import HrProgress from "../components/hr/HrProgress";
import HrResults from "../components/hr/HrResults";
import { runHrAnalysis } from "../services/hrScoring";
import {
  applyShortlistActions,
  buildAuditEntry,
  unshiftAuditEntry,
  applyAuditUndo,
} from "../services/copilotActions";
import {
  listSessions,
  getSession,
  createSession,
  putSession,
} from "../services/sessionStore";
import { saveCandidates, clearCandidates } from "../services/hrStore";
import { applyPassRate, clampPassRate, clearExemptions, scoreOf } from "../services/passRate";
import { warmOcrPool } from "../services/ocr";
import { sendVerificationEmail } from "../services/auth";
import {
  saveHrSession,
  updateCandidateStatus,
  functionsEnabled,
  fetchHrSession,
} from "../services/hrBackend";
import {
  getStorageInfo,
  estimatePayloadBytes,
  formatBytes,
} from "../services/sessionStore";
import { hasAccess } from "../config/ai";
import { SAMPLE_HR_PAYLOAD, SAMPLE_HR_NAME } from "../data/sampleSession";
import VerifyGateModal from "../components/VerifyGateModal";
import Magnetic from "../components/ui/Magnetic";

export default function HrDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const [sessionMeta, setSessionMeta] = useState({ id: sessionId || null, name: "" });
  const [rules, setRules] = useState("");
  const [keywords, setKeywords] = useState("");
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);
  const [sessionState, setSessionState] = useState("loading");
  const [verifyGateOpen, setVerifyGateOpen] = useState(false);
  const fileUrlsRef = useRef([]);
  const signalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getStorageInfo().then((info) => {
      if (!cancelled) setStorageInfo(info);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) return undefined;
    let cancelled = false;

    const applySession = (record) => {
      if (cancelled) return;
      setSessionMeta((m) => ({ ...m, id: record.id, name: record.name, passRate: record.passRate ?? null }));
      const payload = record.payload || {};
      if (!payload.candidates?.length) {
        // Keep the creation-time pass rate visible even before evaluation.
        if (record.passRate != null) setSession({ ...payload, passRate: record.passRate });
        return;
      }
      // Re-apply the stored pass rate so auto-rejections survive reloads.
      const threshold = clampPassRate(payload.passRate ?? record.passRate ?? 0);
      payload.passRate = threshold;
      if (threshold > 0) {
        payload.candidates = applyPassRate(payload.candidates, threshold).candidates;
      }
      const urls = [];
      const fileData = payload.fileData || [];
      payload.candidates.forEach((candidate) => {
        const meta = fileData.find((fd) => fd.fileIndex === candidate.fileIndex);
        if (meta?.bytes) {
          const blob = new Blob([meta.bytes], {
            type: meta.type || candidate.fileType || "application/pdf",
          });
          const url = URL.createObjectURL(blob);
          candidate.url = url;
          urls[candidate.fileIndex] = url;
        }
      });
      fileUrlsRef.current = urls;
      setSession(payload);
      setRules(payload.config?.rules || "");
      setKeywords(payload.config?.keywords || "");
      saveCandidates(payload.candidates);
    };

    if (sessionId) {
      getSession(sessionId).then((record) => {
        if (cancelled) return;
        if (record && record.uid === user.uid && record.role === ROLES.HR) {
          applySession(record);
          setSessionState("ready");
          return;
        }
        // Not on this device yet — another device's session (multi-device
        // HR use). Pull the full record from the cloud worker and cache it
        // locally so subsequent loads are offline-friendly.
        if (functionsEnabled()) {
          fetchHrSession(sessionId)
            .then((remote) => {
              if (cancelled) return;
              if (!remote || remote.uid !== user.uid) {
                navigate("/sessions", { replace: true });
                return;
              }
              putSession(remote).catch(() => {});
              applySession(remote);
              setSessionState("ready");
            })
            .catch(() => {
              if (!cancelled) navigate("/sessions", { replace: true });
            });
        } else {
          navigate("/sessions", { replace: true });
        }
      });
    } else {
      listSessions(user.uid, ROLES.HR).then((list) => {
        if (cancelled) return;
        if (list.length > 0) {
          navigate(`/hr?session=${list[0].id}`, { replace: true });
        } else {
          setSessionState("empty");
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [user?.uid, sessionId, navigate]);

  const handleFilesChange = (nextFiles) => {
    fileUrlsRef.current = nextFiles.map((file) => URL.createObjectURL(file));
    setFiles(nextFiles);
    /* Pre-warm the OCR engine pool while the user reviews job criteria —
       the first scanned PDF then skips the multi-second engine boot. */
    if (nextFiles.length > 0) warmOcrPool();
  };

  const handleCreateSession = async () => {
    if (!user?.uid) return;
    const record = await createSession(user.uid, ROLES.HR, "New Hiring Session");
    if (record) navigate(`/hr?session=${record.id}`);
  };

  const handleLoadSample = async () => {
    if (!user?.uid) return;
    const record = await createSession(user.uid, ROLES.HR, SAMPLE_HR_NAME);
    if (!record) return;
    const payload = {
      ...SAMPLE_HR_PAYLOAD,
      candidates: SAMPLE_HR_PAYLOAD.candidates.map((c) => ({ ...c })),
    };
    const saveResult = await putSession({
      id: record.id,
      uid: user.uid,
      role: ROLES.HR,
      name: record.name,
      payload,
    });
    if (saveResult && saveResult.ok) {
      saveCandidates(payload.candidates);
      navigate(`/hr?session=${record.id}`);
    } else {
      setSaveError(
        "The sample session could not be saved to the browser. Check device storage and try again."
      );
    }
  };

  const persistSessionPayload = async (payload) => {
    if (!user?.uid || !sessionMeta.id) return;
    const saveResult = await putSession({
      id: sessionMeta.id,
      uid: user.uid,
      role: ROLES.HR,
      name: sessionMeta.name,
      // Mirror the pass rate at record level so the sessions list can show
      // it too; the payload copy is the cross-device source of truth.
      passRate: payload?.passRate ?? sessionMeta.passRate ?? null,
      payload,
    });
    if (saveResult && !saveResult.ok) {
      setSaveError(
        saveResult.error === "quota"
          ? "Changes could not be saved — the device storage quota is full. Delete old sessions to free space, or reduce the number or size of uploaded resumes."
          : "Changes could not be saved to the browser. They will be lost on reload."
      );
      return false;
    }
    if (functionsEnabled()) {
      try {
        await saveHrSession({
          id: sessionMeta.id,
          name: sessionMeta.name,
          payload,
        });
      } catch (err) {
        console.warn("[Backend] Session cloud sync failed:", err.message);
      }
    }
    setSaveError(null);
    return true;
  };

  // Pass-rate slider: immediately re-threshold the pipeline. Candidates
  // below the rate move to Rejected (remembering their previous stage);
  // lowering the threshold (or clearing it) restores the auto-rejected
  // ones. Manual rejections are never touched. Moving the slider also
  // lapses every manual rescue (passRateExempt) — changing the rate is an
  // explicit re-run of the policy over the whole pool.
  const handlePassRateChange = async (nextRate) => {
    if (!session?.candidates) return;
    const threshold = clampPassRate(nextRate);
    const base =
      threshold === clampPassRate(session.passRate ?? 0)
        ? session.candidates
        : clearExemptions(session.candidates);
    const { candidates: nextCandidates } = applyPassRate(base, threshold);
    const nextSession = { ...session, passRate: threshold, candidates: nextCandidates };
    setSession(nextSession);
    saveCandidates(nextCandidates);
    await persistSessionPayload(nextSession);
  };

  // Restore one auto-rejected candidate to its pre-rejection stage.
  const handleRestoreRejected = async (candidateId, stage) => {
    if (!session?.candidates) return;
    const nextCandidates = session.candidates.map((c) => {
      if (c.id !== candidateId || c.status !== "rejected") return c;
      const restored = { ...c, status: stage || c.rejectedFrom || "screened" };
      delete restored.rejectedFrom;
      // A hand-rescue sticks: if this candidate is still below the current
      // rate, mark it exempt so the standing threshold can't re-reject it
      // on the next load. Moving the slider lapses every such rescue.
      if (scoreOf(restored) < clampPassRate(session.passRate ?? 0)) {
        restored.passRateExempt = true;
      }
      return restored;
    });
    const nextSession = { ...session, candidates: nextCandidates };
    setSession(nextSession);
    saveCandidates(nextCandidates);
    await persistSessionPayload(nextSession);

    if (functionsEnabled() && sessionMeta.id) {
      try {
        await updateCandidateStatus(sessionMeta.id, candidateId, stage || "screened");
      } catch (err) {
        console.warn("[Backend] Candidate status sync failed:", err.message);
      }
    }
  };

  const handleUpdateCandidateStatus = async (candidateId, status) => {
    if (!session?.candidates || !status) return;
    const nextCandidates = session.candidates.map((c) => {
      if (c.id !== candidateId) return c;
      const next = { ...c, status };
      if (c.status === "rejected" && status !== "rejected") {
        // Leaving Rejected: drop the auto-rejection marker (the move was a
        // human decision) and — while the candidate is still below the
        // current rate — mark the rescue exempt so the next load can't
        // silently undo it.
        delete next.rejectedFrom;
        if (scoreOf(c) < clampPassRate(session.passRate ?? 0)) {
          next.passRateExempt = true;
        }
      } else if (status === "rejected") {
        // Entering Rejected by hand: a rescue marker makes no sense there.
        delete next.passRateExempt;
      }
      return next;
    });
    const nextSession = { ...session, candidates: nextCandidates };
    setSession(nextSession);
    saveCandidates(nextCandidates);
    await persistSessionPayload(nextSession);

    if (functionsEnabled() && sessionMeta.id) {
      try {
        await updateCandidateStatus(sessionMeta.id, candidateId, status);
      } catch (err) {
        console.warn("[Backend] Candidate status sync failed:", err.message);
      }
    }
  };

  const handleToggleShortlist = async (candidateId) => {
    if (!session?.candidates) return;
    const nextCandidates = session.candidates.map((c) => {
      if (c.id !== candidateId) return c;
      const nextShortlisted = !c.shortlisted;
      const nextStatus =
        nextShortlisted && c.status === "screened" ? "shortlisted" : c.status;
      const finalStatus =
        !nextShortlisted && nextStatus === "shortlisted" ? "screened" : nextStatus;
      return { ...c, shortlisted: nextShortlisted, status: finalStatus };
    });
    const nextSession = { ...session, candidates: nextCandidates };
    setSession(nextSession);
    saveCandidates(nextCandidates);
    await persistSessionPayload(nextSession);
  };

  // Apply the Recruiter Copilot's proposed pipeline changes (shortlist
  // add/remove + stage moves; ranks already resolved to candidate ids and
  // confirmed by the user in the chat panel). Shortlist deltas use the same
  // status transitions as a manual toggle; stage moves mirror the manual
  // status setter, including per-candidate cloud sync.
  const handleApplyShortlist = async ({
    adds = [],
    removes = [],
    statusChanges = [],
    reason = "",
  }) => {
    if (
      !session?.candidates ||
      (!adds.length && !removes.length && !statusChanges.length)
    )
      return false;
    const nextCandidates = applyShortlistActions(session.candidates, {
      adds,
      removes,
      statusChanges,
    });

    // Audit: record exactly what changed, for the undo control + change log.
    // A null entry means the proposal was a no-op (session already in that
    // state) — report that back instead of pretending something was applied.
    const auditEntry = buildAuditEntry({
      before: session.candidates,
      after: nextCandidates,
      reason,
    });
    if (!auditEntry) return "noop";
    const nextSession = unshiftAuditEntry(
      { ...session, candidates: nextCandidates },
      auditEntry
    );
    setSession(nextSession);
    saveCandidates(nextCandidates);
    await persistSessionPayload(nextSession);

    if (functionsEnabled() && sessionMeta.id && statusChanges.length) {
      for (const { id, status } of statusChanges) {
        try {
          await updateCandidateStatus(sessionMeta.id, id, status);
        } catch (err) {
          console.warn("[Backend] Candidate status sync failed:", err.message);
        }
      }
    }
    // Return the audit entry id so the chat can offer an undo for this apply.
    return auditEntry.id;
  };

  // Revert one copilot-applied change set (audit entry). Mirrors the apply
  // path: state + local store + session persistence + per-candidate sync.
  const handleUndoShortlist = async (entryId) => {
    if (!session?.candidates) return false;
    const entry = (session.copilotAudit || []).find((e) => e.id === entryId);
    if (!entry) return false;
    const result = applyAuditUndo(session.candidates, entry);
    if (!result) {
      toast.error(
        "Can't undo — the session changed since this was applied. Adjust candidates manually."
      );
      return false;
    }
    const nextSession = {
      ...session,
      candidates: result.candidates,
      copilotAudit: (session.copilotAudit || []).filter((e) => e.id !== entryId),
    };
    setSession(nextSession);
    saveCandidates(result.candidates);
    await persistSessionPayload(nextSession);

    if (functionsEnabled() && sessionMeta.id) {
      for (const ch of entry.changes) {
        if (!ch.status) continue;
        try {
          await updateCandidateStatus(sessionMeta.id, ch.id, ch.status.before);
          toast.success(
            `Undid copilot change — ${ch.name || "candidate"} restored to ${ch.status.before}.`
          );
        } catch (err) {
          console.warn("[Backend] Candidate status sync failed:", err.message);
        }
        continue;
      }
    }
    return true;
  };

  const handleProcess = async () => {
    setError(null);
    if (!files.length) {
      setError("Add at least one resume file before processing.");
      return;
    }
    if (!keywords.trim() && !rules.trim()) {
      setError("Add job rules or keywords so the AI knows what to evaluate against.");
      return;
    }
    if (user && !user.emailVerified) {
      setVerifyGateOpen(true);
      return;
    }
    await runEvaluation();
  };

  const runEvaluation = async () => {
    setProcessing(true);
    /* The pipeline reports an "extracting" phase first (reading/parsing/OCR
       of every file), then flips to "scoring". Seeding the progress object
       as extracting avoids the old single frozen "Evaluating resumes…" bar. */
    setProgress({ stage: "extracting", done: 0, total: files.length, currentFile: "" });
    signalRef.current = { cancelled: false };
    try {
      const result = await runHrAnalysis({
        files,
        rules,
        keywords,
        onProgress: setProgress,
        signal: signalRef.current,
      });

      result.candidates.forEach((candidate) => {
        candidate.url = fileUrlsRef.current[candidate.fileIndex] || null;
      });

      /* Read bytes + persist AFTER the spinner clears — results render
         immediately, storage work happens in the background. The save is
         still awaited on completion (but not blocking the UI), and storage
         failures surface via the persist helper's error banner. */
      // Apply the session's pass rate right away: new results are
      // thresholded before the leaderboard is even shown.
      const threshold = clampPassRate(sessionMeta.passRate ?? 0);
      const nextSession = {
        ...result,
        config: { rules, keywords },
        passRate: threshold,
        candidates: threshold > 0 ? applyPassRate(result.candidates, threshold).candidates : result.candidates,
      };
      setSessionMeta((m) => ({ ...m, passRate: threshold }));
      setSession(nextSession);
      saveCandidates(nextSession.candidates);
      if (threshold > 0) {
        const n = nextSession.candidates.filter((c) => c.status === "rejected").length;
        if (n > 0) {
          toast.info(
            `${n} candidate${n === 1 ? "" : "s"} below the ${threshold}% pass rate were moved to Rejected.`,
            { duration: 6000 }
          );
        }
      }

      const fallbackCount = result.candidates.filter(
        (c) => c.evaluation?.usedFallback
      ).length;
      if (fallbackCount > 0) {
        toast.warning(
          `${fallbackCount} resume${fallbackCount === 1 ? "" : "s"} used a local heuristic estimate because the AI couldn't be reached. Review those scores manually.`,
          { duration: 6000 }
        );
      } else if (result.summary?.mode === "local") {
        toast.success(
          `Ranked ${result.candidates.length} candidate(s) with fast local scoring (no AI wait).`,
          { duration: 5000 }
        );
      } else {
        toast.success(`Ranked ${result.candidates.length} candidate(s) successfully.`);
      }

      /* Session record creation + byte snapshot + local/cloud persistence
         all run in the background — none of it blocks the results UI. The
         only await between "Process" click and results is the AI run. */
      const persistInBackground = async () => {
        try {
          let id = sessionMeta.id;
          if (user?.uid && !id) {
            const created = await createSession(user.uid, ROLES.HR, sessionMeta.name || "HR Session");
            if (created) {
              id = created.id;
              setSessionMeta({ id: created.id, name: created.name });
              navigate(`/hr?session=${created.id}`, { replace: true });
            }
          }
          const fileData = await Promise.all(
            files.map(async (file, fileIndex) => ({
              fileIndex,
              name: file.name,
              type: file.type,
              size: file.size,
              bytes: await file.arrayBuffer(),
            }))
          );
          nextSession.fileData = fileData;
          if (user?.uid && id) {
            await persistSessionPayload({ ...nextSession });
          }
        } catch (persistErr) {
          console.warn("[HR] Background session save failed:", persistErr?.message || persistErr);
        }
      };
      persistInBackground();
    } catch (err) {
      setError(err.message || "Processing failed. Please try again.");
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  const handleCancel = () => {
    if (signalRef.current) signalRef.current.cancelled = true;
  };

  const handleClearSession = async () => {
    if (!window.confirm("Clear the current evaluation results from this device?")) return;
    setSession(null);
    setProgress(null);
    setRules("");
    setKeywords("");
    fileUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    fileUrlsRef.current = [];
    setFiles([]);
    clearCandidates();
    if (user?.uid && sessionMeta.id) {
      await putSession({
        id: sessionMeta.id,
        uid: user.uid,
        role: ROLES.HR,
        name: sessionMeta.name,
        payload: {},
      });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg)]/85 text-[var(--theme-text,#0f172a)] pb-16 transition-colors duration-300">
      <Seo
        title={sessionMeta.name ? `${sessionMeta.name} — HR Workspace` : "HR Recruiter Workspace"}
        description="Screen, compare, and rank candidate resumes against your job requirements with AI."
        noindex
      />
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-1 text-xs font-black text-primary-600 mb-2 shadow-2xs">
                <span className="inline-flex items-center gap-1.5"><Icon name="building" className="h-3.5 w-3.5" />HR &amp; Recruiter Intelligence Suite</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-[var(--theme-text,#0f172a)]">HR Recruiter Workspace</h1>
              <p className="text-[var(--theme-text-muted,#475569)] mt-1 font-semibold text-sm sm:text-base">
                Screen, compare, and rank candidate resumes against your job requirements — with an
                AI copilot grounded in the uploaded data.
              </p>
            </div>
            {sessionMeta.name && (
              <span className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-4 py-1.5 text-xs font-black text-primary-600 shadow-2xs">
                <Icon name="folder" className="h-3.5 w-3.5" /> {sessionMeta.name}
              </span>
            )}
          </div>
        </section>

        {sessionState === "empty" ? (
          <div className="rounded-3xl border border-dashed border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-10 sm:p-12 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--theme-bg)]/85 text-primary-600 border border-[var(--theme-border,#e2e8f0)] shadow-2xs mb-4">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-[var(--theme-text,#0f172a)]">Start Your First Hiring Session</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--theme-text-muted,#475569)] font-medium leading-relaxed">
              Each session holds its own job rules, candidate resumes, and ranked results — so you
              can run one per role. Create one to get started, or load a pre-built sample to explore
              the workspace immediately.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Magnetic strength={0.2}>
<button
                type="button"
                onClick={handleCreateSession}
                className="rounded-2xl bg-primary-600 px-7 py-3.5 text-sm font-bold text-white hover:bg-primary-700 active:scale-95 shadow-md shadow-primary-600/25 transition-all cursor-pointer"
              >
                + Create Hiring Session
              </button>
              </Magnetic>
              <button
                type="button"
                onClick={handleLoadSample}
                className="rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-7 py-3.5 text-sm font-bold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 active:scale-95 shadow-2xs transition-all cursor-pointer"
              >
                Load Sample Session
              </button>
            </div>
          </div>
        ) : (
          <>
        <SessionBar role={ROLES.HR} sessionId={sessionMeta.id} name={sessionMeta.name} />

        {!hasAccess() && (
          <div className="rounded-xl border border-shortlist-200 bg-shortlist-50 p-4 text-sm font-medium text-shortlist-700">
            AI proxy is not configured. Deploy the Cloudflare Worker and set <code className="text-shortlist-700 font-mono">VITE_AI_PROXY_URL</code> in your .env
            evaluations. Without it, resumes are scored with a basic keyword heuristic.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {saveError && (
          <div className="rounded-xl border border-shortlist-200 bg-shortlist-50 p-4 text-sm font-medium text-shortlist-700">
            {saveError}
          </div>
        )}

        {storageInfo?.quota > 0 && storageInfo.usage / storageInfo.quota > 0.9 && (
          <div className="rounded-xl border border-shortlist-200 bg-shortlist-50 p-4 text-sm font-medium text-shortlist-700">
            Device storage is {Math.round((storageInfo.usage / storageInfo.quota) * 100)}% full.
            If saves start failing, delete old sessions or reduce the number and size of uploaded
            resumes.
          </div>
        )}

        <section className="space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary-600">
              Step 1 · Job Setup
            </h2>
            <p className="text-sm text-[var(--theme-text-muted,#475569)] mt-1 font-medium">
              Define the role and what the AI should evaluate candidates against.
            </p>
          </div>
          <HrConfigForm
            rules={rules}
            keywords={keywords}
            onRulesChange={setRules}
            onKeywordsChange={setKeywords}
            files={files}
            onFilesChange={handleFilesChange}
            onProcess={handleProcess}
            processing={processing}
            expandedKeywords={session?.expandedKeywords}
            disabled={processing}
          />
          <p className="text-xs text-[var(--theme-text-muted)] font-medium">
            Files are processed for analysis on this device. HR results stay on this device and are
            never uploaded to a server.
          </p>
        </section>

        {processing && (
          <div className="space-y-3">
            <HrProgress progress={progress} />
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-2 text-sm font-semibold text-[var(--theme-text-muted)] hover:bg-[#0B1F3A]/[0.04] shadow-2xs transition-all"
            >
              Cancel
            </button>
          </div>
        )}

        {session && !processing && (
          <>
        <HrResults
          session={session}
          sessionId={sessionMeta.id}
          onToggleShortlist={handleToggleShortlist}
          onUpdateStatus={handleUpdateCandidateStatus}
          onApplyShortlist={handleApplyShortlist}
          onUndoShortlist={handleUndoShortlist}
          onPassRateChange={handlePassRateChange}
          onRestoreRejected={handleRestoreRejected}
        />
            {session.summary && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs text-[var(--theme-text-muted)] font-medium">
                  {session.summary.processed}/{session.summary.total} processed
                  {session.summary.failed > 0 ? `, ${session.summary.failed} failed` : ""}. Results
                  are stored only on this device.
                </p>
                <p className="text-xs text-[var(--theme-text-muted)]">
                  Session storage: {formatBytes(estimatePayloadBytes(session))}
                  {storageInfo?.quota ? ` · device ${formatBytes(storageInfo.usage)} of ${formatBytes(storageInfo.quota)} used` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearSession}
                className="rounded-xl border border-red-500/30 bg-[var(--theme-card)] px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/10 shadow-2xs transition-all"
              >
                Clear Results
              </button>
            </div>
            )}
          </>
        )}
        </>
        )}
      </main>

      {verifyGateOpen && (
        <VerifyGateModal
          onClose={() => setVerifyGateOpen(false)}
          onResend={() => user && sendVerificationEmail(user)}
          onContinue={() => {
            setVerifyGateOpen(false);
            runEvaluation();
          }}
        />
      )}
    </div>
  );
}
