import { GeminiService } from "./gemini";
import { extractText } from "./fileParser";
import { hasAccess } from "../config/ai";
import { getExtractedText, putExtractedText, hashBytes } from "./extractCache";
import { localEvaluate } from "./localScoring";

/* Tunable via env so the numbers can be matched to the AI plan's rate
   limits: VITE_HR_CONCURRENCY (parallel batches in flight) and
   VITE_HR_BATCH_SIZE (resumes per AI call). The batch default of 3 keeps
   each proxy call inside Cloudflare's ~100 s window on the free tier —
   6-resume prompts reliably hit HTTP 524 there. Concurrency 6 keeps the
   pipe full (6x3 = 18 resumes in flight). 429s back off and retry
   automatically. */
function envInt(name, fallback, { min = 1, max = 12 } = {}) {
  const raw = import.meta.env?.[name];
  const parsed = Number.parseInt(raw ?? "", 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export const CONCURRENCY = envInt("VITE_HR_CONCURRENCY", 6);
const BATCH_SIZE = envInt("VITE_HR_BATCH_SIZE", 3);
/* Local scoring is the default engine at every run size: measured on real
   resumes, free-tier AI batch calls take 90-300+ s EACH (single-resume
   batches included) and routinely time out — unusable for interactive
   ranking. The local engine ranks 500 resumes in seconds with zero
   tokens. The threshold is the minimum file count for auto-local mode:
   0 means local ALWAYS (the default). To run AI evaluation instead,
   pass mode:"ai" for that run — or raise the threshold above your
   typical run size to push small runs to AI (large runs stay local). */
export const FAST_LOCAL_THRESHOLD = envInt("VITE_HR_FAST_LOCAL_THRESHOLD", 0, { min: 0, max: 5000 });
const MAX_RESUME_CHARS = 8000;

export function truncateResume(text, max = MAX_RESUME_CHARS) {
  const t = String(text || "");
  return t.length > max ? `${t.slice(0, max)}\n[truncated]` : t;
}

export function keywordCoverage(resumeText, keywords) {
  const text = (resumeText || "").toLowerCase();
  const list = (keywords || []).map((k) => String(k).trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return 0;
  const hits = list.filter((k) => text.includes(k)).length;
  return Math.round((hits / list.length) * 100);
}

export function aggregateScores(result) {
  const ratings = result?.ratings || {};
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
  const skillScore = clamp(ratings.skills);
  const expScore = clamp(ratings.experience);
  const eduScore = clamp(ratings.education);
  const projScore = clamp(ratings.projects);
  const keywordScore = clamp(ratings.keywordMatch);

  const total = Math.round(
    skillScore * 0.25 + expScore * 0.25 + eduScore * 0.15 + projScore * 0.15 + keywordScore * 0.2
  );

  return {
    skills: skillScore,
    experience: expScore,
    education: eduScore,
    projects: projScore,
    keywordMatch: keywordScore,
    overall: clamp(ratings.overall),
    total,
  };
}

function fallbackEvaluation({ resumeText, fileName, keywords }) {
  const coverage = keywordCoverage(resumeText, keywords);
  const text = resumeText || "";
  const has = (pattern) => new RegExp(pattern, "i").test(text);

  const sections = {
    skills: { present: has("skill|technolog|proficien|language") },
    experience: { present: has("experience|work history|employment|role") },
    education: { present: has("education|bachelor|master|degree|university|college") },
    projects: { present: has("project|built|developed|github") },
  };

  const base = sections.skills.present + sections.experience.present + sections.education.present + sections.projects.present;
  const structure = Math.min(100, Math.round((base / 4) * 100));
  const overall = Math.round(0.7 * coverage + 0.3 * structure);

  return {
    name: fileName ? fileName.replace(/\.[^.]+$/, "") : "",
    email: "",
    phone: "",
    headline: "",
    skills: [],
    matchedKeywords: [],
    missingKeywords: [],
    sections: Object.fromEntries(
      Object.entries(sections).map(([key, s]) => [
        key,
        { present: s.present, quality: s.present ? 60 : 0, note: s.present ? "Section found" : "Section not found" },
      ])
    ),
    ratings: {
      skills: sections.skills.present ? 60 : 0,
      experience: sections.experience.present ? 60 : 0,
      education: sections.education.present ? 60 : 0,
      projects: sections.projects.present ? 60 : 0,
      keywordMatch: coverage,
      overall,
    },
    strengths: base >= 3 ? ["Resume covers most standard sections"] : [],
    concerns: [coverage < 40 ? "Low keyword match with the job requirements" : "Limited detail extracted"],
    rationale: "Heuristic evaluation (Gemini unavailable). Based on section coverage and keyword matches.",
  };
}

function normalizeEvaluation(raw, resumeText, fileName, keywords) {
  const fallback = fallbackEvaluation({ resumeText, fileName, keywords });
  const merged = { ...fallback, ...raw };
  merged.ratings = { ...fallback.ratings, ...merged.ratings };
  merged.sections = { ...fallback.sections, ...merged.sections };
  merged.usedFallback = false;
  return merged;
}

function buildBatchInput({ batch, rules, keywords }) {
  const keywordList = Array.isArray(keywords) ? keywords : [];
  return [
    `JOB RULES:\n"""\n${rules || "(none provided)"}\n"""`,
    `JOB KEYWORDS:\n"""\n${keywordList.join(", ") || "(none provided)"}\n"""`,
    ...batch.map(
      ({ fileName, resumeText }, i) =>
        `--- CANDIDATE ${i} (file: ${fileName || "resume"}) ---\n"""\n${resumeText}\n"""`
    ),
  ].join("\n\n");
}

async function evaluateBatch({ batch, rules, keywords }) {
  const fallbackFor = ({ resumeText, fileName }) => {
    const fallback = fallbackEvaluation({ resumeText, fileName, keywords });
    fallback.usedFallback = true;
    return fallback;
  };

  const input = buildBatchInput({ batch, rules, keywords });
  let rawMap = null;
  try {
    rawMap = await GeminiService.evaluateBatch(input);
  } catch {
    // AI unavailable — fall back per candidate.
  }

  if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) {
    return batch.map((item) => fallbackFor(item));
  }

  return batch.map((item, i) => {
    const raw = rawMap[String(i)] || rawMap[String(item.fileName)];
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return normalizeEvaluation(raw, item.resumeText, item.fileName, keywords);
    }
    return fallbackFor(item);
  });
}

async function runWithConcurrency(items, limit, worker, onItem, signal) {
  const results = Array.from({ length: items.length });
  let nextIndex = 0;
  const failed = [];

  const runWorker = async () => {
    while (nextIndex < items.length) {
      if (signal?.cancelled) return;
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];
      try {
        const value = await worker(item, index);
        if (signal?.cancelled) {
          results[index] = { cancelled: true };
          return;
        }
        results[index] = value;
        onItem?.(index, results[index], null);
      } catch (err) {
        if (signal?.cancelled) {
          results[index] = { cancelled: true };
          return;
        }
        results[index] = null;
        failed.push(index);
        onItem?.(index, null, err);
      }
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker());
  await Promise.all(workers);
  return { results, failed };
}

/* Extraction pipeline shared by all batch workers.
 *
 * Parsing (pdfjs text layer + fallback OCR) is CPU-heavy on the main
 * thread, so concurrent batches previously parsed simultaneously and
 * thrashed. A global semaphore caps extraction at two in flight while
 * AI calls stay fully parallel. Results are cached in IndexedDB by file
 * hash, so re-runs and session reloads skip parsing entirely. Cache
 * failures are silently ignored — extraction falls back to the direct
 * parse path, so behavior is identical when IndexedDB is unavailable. */
export const MAX_CONCURRENT_EXTRACTS = 2;
let activeExtracts = 0;
const extractQueue = [];

function acquireExtractSlot() {
  if (activeExtracts < MAX_CONCURRENT_EXTRACTS) {
    activeExtracts += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => extractQueue.push(resolve));
}

function releaseExtractSlot() {
  activeExtracts -= 1;
  const next = extractQueue.shift();
  if (next) next();
}

async function extractWithCache(file, fileHashes, onExtracted) {
  await acquireExtractSlot();
  try {
    let hash = fileHashes.get(file);
    if (!hash) {
      try {
        hash = await hashBytes(new Uint8Array(await file.arrayBuffer()));
        fileHashes.set(file, hash);
      } catch {
        // Unreadable bytes — skip cache, go straight to extraction.
      }
    }
    if (hash) {
      const cached = await getExtractedText(hash);
      if (cached != null) {
        onExtracted?.();
        return cached;
      }
    }
    const text = await extractText(file);
    if (hash && text) putExtractedText(hash, text);
    onExtracted?.();
    return text;
  } finally {
    releaseExtractSlot();
  }
}

export async function expandKeywords(keywords, extraContext) {
  try {
    const result = await GeminiService.expandKeywords(keywords, extraContext);
    const list = Array.isArray(result?.keywords) ? result.keywords : [];
    const seen = new Set();
    const combined = [];
    keywords
      .split(/[,;\n]+/)
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean)
      .forEach((k) => {
        if (!seen.has(k)) {
          seen.add(k);
          combined.push(k);
        }
      });
    list.forEach((k) => {
      const key = String(k).trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        combined.push(key);
      }
    });
    return combined;
  } catch {
    const seen = new Set();
    return keywords
      .split(/[,;\n]+/)
      .map((k) => k.trim().toLowerCase())
      .filter((k) => {
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  }
}

/* Rejects when `signal.cancelled` flips, racing the awaited promise.
   Without this, Cancel could not interrupt a 300 s in-flight AI call —
   the UI sat on "Evaluating…" until the request itself finished. */
function cancelable(promise, signal, label = "Processing cancelled.") {
  if (!signal) return promise;
  let rejectCancel;
  const cancelPromise = new Promise((_, reject) => {
    rejectCancel = reject;
  });
  const poll = setInterval(() => {
    if (signal.cancelled) rejectCancel(new Error(label));
  }, 150);
  const cleanup = () => clearInterval(poll);
  promise.then(cleanup, cleanup);
  return Promise.race([promise, cancelPromise]).finally(cleanup);
}

export async function runHrAnalysis({
  files,
  rules,
  keywords,
  onProgress,
  onCandidate,
  signal,
  mode,
}) {
  if (!files?.length) throw new Error("No files uploaded.");
  if (!keywords.trim() && !rules.trim()) {
    throw new Error("Add job rules or keywords so the AI knows what to evaluate against.");
  }

  /* Bulk runs skip AI entirely: free-tier batch calls cost 30-120 s each,
     so 100-500 resumes would take hours and 429/524 constantly. The local
     scorer produces the same candidate shape instantly (no tokens).
     Override per run with mode: "ai" | "local". */
  const useLocal =
    mode === "local" || (mode !== "ai" && files.length >= FAST_LOCAL_THRESHOLD);
  const localMode = useLocal || !hasAccess();

  const expandedKeywords = localMode
    ? keywords
        .split(/[;,\n]+/)
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
    : await expandKeywords(keywords, rules);
  if (signal?.cancelled) throw new Error("Processing cancelled.");

  const candidates = [];
  const failed = [];
  let failedCount = 0;
  let extractedCount = 0;
  const extractedTotal = files.length;
  let completedFiles = 0;
  const fileHashes = new Map();

  const emitExtractionProgress = (currentFile) => {
    onProgress?.({
      stage: "extracting",
      done: extractedCount,
      total: extractedTotal,
      extracted: extractedCount,
      currentFile,
      failedCount,
      aiEnabled: hasAccess(),
      local: localMode,
    });
  };
  emitExtractionProgress("");

  const batches = [];
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    batches.push(files.slice(i, i + BATCH_SIZE));
  }

  const { results } = await runWithConcurrency(
    batches,
    CONCURRENCY,
    async (batch, _batchIndex) => {
      const extracted = await Promise.all(
        batch.map(async (file) => {
          const resumeText = await extractWithCache(file, fileHashes, () => {
            extractedCount += 1;
            emitExtractionProgress(file.name);
          }).catch(() => null);
          return { file, resumeText: resumeText === null ? null : truncateResume(resumeText) };
        })
      );

      onProgress?.({
        stage: "scoring",
        done: completedFiles,
        total: extractedTotal,
        extracted: extractedCount,
        currentFile: batch[0]?.name || "",
        failedCount,
        aiEnabled: hasAccess(),
        local: localMode,
      });

      const readable = [];
      const posToReadableIndex = new Map();
      extracted.forEach((entry, pos) => {
        if (entry.resumeText !== null) {
          posToReadableIndex.set(pos, readable.length);
          readable.push({ fileName: entry.file.name, resumeText: entry.resumeText });
        }
      });

      let evaluations = [];
      if (readable.length) {
        if (localMode) {
          /* Instant local scoring — no network, no tokens. */
          evaluations = readable.map(({ resumeText, fileName }) =>
            localEvaluate({ resumeText, fileName, keywords: expandedKeywords, rules })
          );
        } else {
          /* Cancel must be able to interrupt the in-flight call. */
          evaluations = await cancelable(
            evaluateBatch({ batch: readable, rules, keywords: expandedKeywords }),
            signal
          );
        }
      }

      return extracted.map(({ file, resumeText }, pos) => {
        if (resumeText === null) return null;
        const evalIndex = posToReadableIndex.get(pos);
        const evaluation =
          evaluations[evalIndex] ||
          (() => {
            const fallback = fallbackEvaluation({ resumeText, fileName: file.name, keywords: expandedKeywords });
            fallback.usedFallback = true;
            return fallback;
          })();
        evaluation.name = evaluation.name || file.name.replace(/\.[^.]+$/, "");
        const coverage = keywordCoverage(resumeText, expandedKeywords);
        const scores = aggregateScores(evaluation);
        const candidate = {
          id: `${Date.now()}-${pos}-${Math.random().toString(36).slice(2, 8)}`,
          fileIndex: pos,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          resumeText,
          evaluation,
          coverage,
          scores,
          rank: 0,
        };
        return candidate;
      });
    },
    (batchIndex, batchResults, _err) => {
      const batch = batches[batchIndex] || [];
      batch.forEach((_file, i) => {
        /* Batches complete out of order (concurrent workers), so count
           completions instead of deriving done from the batch index —
           that keeps the progress bar monotonic. */
        completedFiles += 1;
        const candidate = batchResults?.[i] || null;
        if (!candidate) failedCount += 1;
        onProgress?.({
          stage: "processing",
          done: completedFiles,
          total: files.length,
          currentFile: batch[i]?.name,
          failedCount,
          extracted: extractedCount,
          aiEnabled: hasAccess(),
        });
        if (candidate) onCandidate?.(candidate);
      });
    },
    signal
  );

  let cancelledCount = 0;
  results.forEach((batchResults, batchIndex) => {
    const batch = batches[batchIndex] || [];
    (batchResults || []).forEach((candidate, i) => {
      const file = batch[i]?.file || batch[i];
      const index = batchIndex * BATCH_SIZE + i;
      if (candidate?.cancelled) {
        cancelledCount += 1;
        failed.push({ index, file, error: "Cancelled" });
      } else if (candidate) {
        candidate.fileIndex = index;
        candidates.push(candidate);
      } else {
        failed.push({ index, file, error: "Could not read this file." });
      }
    });
  });

  const ranked = [...candidates].sort((a, b) => b.scores.total - a.scores.total);
  ranked.forEach((candidate, i) => {
    candidate.rank = i + 1;
  });

  return {
    expandedKeywords,
    candidates,
    failed,
    summary: {
      total: files.length,
      processed: candidates.length,
      failed: failed.length - cancelledCount,
      cancelled: cancelledCount,
      hasGemini: hasAccess(),
      mode: localMode ? "local" : "ai",
    },
  };
}

function formatCandidateBlock(candidate, index) {
  const e = candidate.evaluation || {};
  const s = candidate.scores || {};
  return [
    `${index + 1}. ${e.name || candidate.fileName}`,
    `   File: ${candidate.fileName}`,
    `   Pipeline stage: ${candidate.status || "screened"} | Shortlisted: ${candidate.shortlisted ? "yes" : "no"}`,
    `   Overall: ${s.total ?? "?"}/100 | Skills: ${s.skills} | Experience: ${s.experience} | Education: ${s.education} | Projects: ${s.projects} | Keywords: ${s.keywordMatch}`,
    `   Headline: ${e.headline || "n/a"}`,
    `   Skills: ${(e.skills || []).join(", ") || "n/a"}`,
    `   Matched keywords: ${(e.matchedKeywords || []).join(", ") || "none"}`,
    `   Missing keywords: ${(e.missingKeywords || []).join(", ") || "none"}`,
    `   Strengths: ${(e.strengths || []).join("; ") || "n/a"}`,
    `   Concerns: ${(e.concerns || []).join("; ") || "n/a"}`,
    `   Rationale: ${e.rationale || ""}`,
  ].join("\n");
}

export function buildChatCorpus(candidates) {
  return (candidates || [])
    .map((c, i) => formatCandidateBlock(c, i))
    .join("\n\n");
}

export function generateCandidatesCsv(candidates) {
  const headers = ["Rank", "Candidate Name", "File", "Overall Match", "Skills", "Experience", "Education", "Projects", "Keyword Match", "Shortlisted"];
  const rows = (candidates || []).map((c) => [
    c.rank ?? "—",
    `"${(c.evaluation?.name || c.fileName || "").replace(/"/g, '""')}"`,
    `"${c.fileName}"`,
    `${c.scores?.total ?? c.scores?.overall ?? 0}%`,
    `${c.scores?.skills ?? 0}%`,
    `${c.scores?.experience ?? 0}%`,
    `${c.scores?.education ?? 0}%`,
    `${c.scores?.projects ?? 0}%`,
    `${c.scores?.keywordMatch ?? 0}%`,
    c.shortlisted ? "Yes" : "No",
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function tokenize(text) {
  return (String(text || "")
    .toLowerCase()
    .match(/[a-z][a-z0-9]{2,}/g) || []);
}

function searchableText(candidate) {
  const e = candidate.evaluation || {};
  return [
    e.name,
    candidate.fileName,
    e.headline,
    (e.skills || []).join(" "),
    (e.matchedKeywords || []).join(" "),
    (e.strengths || []).join(" "),
    (e.concerns || []).join(" "),
    candidate.resumeText,
  ]
    .filter(Boolean)
    .join(" ");
}

/*
 * Ordinal words -> rank numbers, so questions like "explain the tenth
 * candidate" or "summarize the second best" resolve to ranked blocks.
 */
const ORDINAL_WORDS = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
  sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15,
  sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20,
};

/**
 * Extract rank references from a chat question: "10th", "rank 3", "#5",
 * "top 3", "best", "worst", "last", "tenth", "second highest".
 * Returns a Set of valid 1-based ranks (invalid/out-of-range dropped).
 */
export function extractRankReferences(question, candidateCount) {
  const ranks = new Set();
  if (!question || candidateCount <= 0) return ranks;
  const text = String(question).toLowerCase();

  if (/\b(last|worst|bottom)\b/.test(text)) ranks.add(candidateCount);

  const topN = text.match(/\b(?:top|best|first)\s+(\d{1,3})\b/);
  if (topN) {
    const n = Math.min(parseInt(topN[1], 10) || 1, candidateCount);
    for (let i = 1; i <= n; i += 1) ranks.add(i);
  } else if (/\b(top|best|winner|leading)\b/.test(text)) {
    ranks.add(1);
  }

  // "10th", "3rd", "21st"
  for (const m of text.matchAll(/\b(\d{1,3})(?:st|nd|rd|th)\b/g)) {
    ranks.add(parseInt(m[1], 10));
  }
  // "rank 3", "position 12", "candidate 5", "number 7", "#9"
  for (const m of text.matchAll(/\b(?:rank|position|candidate|spot|place|number|no)\.?\s*#?(\d{1,3})\b/g)) {
    ranks.add(parseInt(m[1], 10));
  }
  for (const m of text.matchAll(/#(\d{1,3})\b/g)) {
    ranks.add(parseInt(m[1], 10));
  }
  // word ordinals: "tenth candidate", "the second one"
  for (const [word, rank] of Object.entries(ORDINAL_WORDS)) {
    if (new RegExp("\\b" + word + "\\b").test(text)) ranks.add(rank);
  }
  // "second highest" / "third worst" style
  const nthHigh = text.match(/\b(first|second|third|fourth|fifth)\s+(?:highest|best|top)\b/);
  if (nthHigh) ranks.add(ORDINAL_WORDS[nthHigh[1]]);
  const nthLow = text.match(/\b(first|second|third|fourth|fifth)\s+(?:lowest|worst)\b/);
  if (nthLow) ranks.add(Math.max(1, candidateCount - ORDINAL_WORDS[nthLow[1]] + 1));

  for (const r of [...ranks]) {
    if (r < 1 || r > candidateCount) ranks.delete(r);
  }
  return ranks;
}

export function selectChatContext(candidates, question, maxChars = 12000) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (!list.length) return "";
  const terms = tokenize(question);

  // Resolve rank/positional references first. These never match resume
  // body text, so "explain the 10th candidate" previously selected no
  // candidate data at all and the model could only refuse.
  const referencedRanks = extractRankReferences(question, list.length);
  const picked = [];
  for (const r of referencedRanks) {
    const match = list.find((c) => (c.rank ?? 0) === r);
    if (match && !picked.includes(match)) picked.push(match);
  }

  const ranked = list
    .map((candidate, index) => {
      let score = 0;
      if (terms.length) {
        const haystack = searchableText(candidate);
        for (const term of terms) {
          if (haystack.includes(term)) score += 1;
        }
      }
      return { candidate, index, score };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.candidate.rank ?? 0) - (b.candidate.rank ?? 0) ||
        a.index - b.index
    );

  const parts = [];
  let used = 0;

  // Rank-referenced candidates are always included, ahead of text matches.
  for (const candidate of picked) {
    const index = list.indexOf(candidate);
    const block = formatCandidateBlock(candidate, index);
    if (used + block.length > maxChars) break;
    parts.push(block);
    used += block.length;
  }

  for (const { candidate, index } of ranked) {
    if (picked.includes(candidate)) continue;
    const block = formatCandidateBlock(candidate, index);
    if (parts.length > 0 && used + block.length > maxChars) break;
    parts.push(block);
    used += block.length;
  }
  return parts.join("\n\n");
}
