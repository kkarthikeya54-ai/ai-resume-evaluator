import { useEffect, useRef, useState } from "react";
import { askHrChat } from "../../services/hrChat";
import {
  parseShortlistActions,
  resolveActionRanks,
} from "../../services/copilotActions";
import Markdown from "./Markdown";
import Icon from "../ui/Icon";

// rank -> display name, so proposal line items show who each action hits
// (makes any model rank/prose mismatch visible before the user confirms).
const useNameByRank = (candidates) => {
  const map = new Map(
    (Array.isArray(candidates) ? candidates : []).map((c) => [c.rank, c.evaluation?.name || c.fileName || `#${c.rank}`])
  );
  return (rank) => map.get(rank) || `#${rank}`;
};

const STATUS_LABELS = {
  screened: "Screened",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  hired: "Hired",
};

const SUGGESTIONS = [
  "Who is the top candidate and why?",
  "Which candidates match the job keywords?",
  "Summarize the strengths and concerns of the top 3.",
  "Which candidates are missing key skills?",
  "Rank the candidates by experience.",
];

// Reveals a fresh assistant answer progressively through the Markdown renderer
// by typing the raw source (so **bold** etc. still render correctly).
// Respect prefers-reduced-motion: render instantly.
function useTypedPrefix(fullText) {
  const [count, setCount] = useState(fullText.length);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.visibilityState === "hidden")
    ) {
      setCount(fullText.length); // reveal instantly (background tab can't animate)
      return undefined;
    }
    setCount(0);
    let raf = null;
    let last = null;
    let acc = 0;
    let shown = 0;
    let cancelled = false;
    const speed = 8; // ms per character
    const step = (now) => {
      if (cancelled) return;
      if (last === null) last = now;
      acc += now - last;
      last = now;
      if (acc >= speed && shown < fullText.length) {
        const advance = Math.min(
          Math.floor(acc / speed),
          fullText.length - shown
        );
        acc -= advance * speed;
        shown += advance;
        setCount(shown);
      }
      if (shown < fullText.length) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [fullText]);

  return fullText.slice(0, count);
}

function TypedAnswer({ text }) {
  const typed = useTypedPrefix(text);
  return <Markdown>{typed}</Markdown>;
}

export default function HrChatPanel({
  rules,
  keywords,
  candidates,
  onApplyShortlist,
  onUndoShortlist,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [appliedIdx, setAppliedIdx] = useState(null); // message idx whose proposal was applied/dismissed
  const [applyErrorIdx, setApplyErrorIdx] = useState(null); // message idx showing an apply error
  const [lastProvider, setLastProvider] = useState(null); // provider of the most recent answer
  const [applyError, setApplyError] = useState("");
  const scrollRef = useRef(null);
  const nameForRank = useNameByRank(candidates);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;
    setInput("");
    setError(null);
    setApplyError("");
    setApplyErrorIdx(null);
    const userMessage = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    try {
      const history = [...messages, userMessage];
      const { answer: rawAnswer, provider } = await askHrChat({
        rules,
        keywords,
        candidates,
        history,
        question,
      });
      const { cleanAnswer, actions } = parseShortlistActions(rawAnswer);
      setLastProvider(provider);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: cleanAnswer, actions, provider },
      ]);
    } catch (err) {
      setError(err.message || "The assistant could not respond. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (idx) => {
    const msg = messages[idx];
    if (!msg?.actions || !onApplyShortlist) return;
    setApplyError("");
    setApplyErrorIdx(null);
    const { adds, removes, statusChanges } = resolveActionRanks(
      msg.actions,
      candidates
    );
    if (!adds.length && !removes.length && !statusChanges.length) {
      setApplyError(
        "The suggested ranks don't match candidates in this session — nothing applied."
      );
      setApplyErrorIdx(idx);
      return;
    }
    try {
      const resolved = await onApplyShortlist({
        adds,
        removes,
        statusChanges,
        reason: msg.actions.reason || "",
      });
      if (resolved === "noop") {
        // The session was already in the proposed state — nothing to apply.
        setMessages((m) =>
          m.map((x, j) => (j === idx ? { ...x, appliedEntryId: null, noop: true } : x))
        );
      } else {
        setMessages((m) =>
          m.map((x, j) =>
            j === idx ? { ...x, appliedEntryId: resolved || null } : x
          )
        );
      }
      setAppliedIdx(idx);
    } catch (err) {
      setApplyError(err?.message || "Could not apply the shortlist changes.");
      setApplyErrorIdx(idx);
    }
  };

  // Revert this proposal's applied changes from the "Applied" chip. On
  // success the proposal bar re-appears so the user can re-apply or dismiss.
  const handleUndoApplied = async (idx) => {
    const msg = messages[idx];
    if (!msg?.appliedEntryId || !onUndoShortlist) return;
    const ok = await onUndoShortlist(msg.appliedEntryId);
    if (ok) {
      setAppliedIdx((cur) => (cur === idx ? null : cur));
    }
  };

  const handleDismiss = (idx) => setAppliedIdx(idx);

  const isRefusal = (content) => /i can only answer questions/i.test(content || "");

  return (
    <div className="ht-crest ht-engraved flex h-[600px] flex-col rounded-2xl border border-[var(--theme-border)] overflow-hidden shadow-md">
      <div className="border-b border-[var(--theme-border)] px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-[var(--theme-text)]">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-white shadow-xs">
              <Icon name="bot" className="h-4 w-4" />
            </span>
            Recruiter Copilot
          </h3>
          <span className="rounded-full bg-primary-100 border border-primary-300/40 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-primary-600">
            {lastProvider === "gemini"
              ? "Gemini AI"
              : lastProvider === "nvidia"
                ? "NVIDIA AI"
                : lastProvider && lastProvider !== "unknown"
                  ? lastProvider.toUpperCase()
                  : "Gemini + NVIDIA fallback"}
          </span>
        </div>
        <p className="mt-1.5 text-xs font-medium text-[var(--theme-text-muted)]">
          Answers are grounded strictly in the uploaded resumes and job requirements.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--theme-text-muted)]">
              Ask about candidates, their scores, or how they match the job requirements:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={loading}
                  style={{ animationDelay: `${idx * 70}ms` }}
                  className="stagger-item rounded-xl border border-[var(--theme-border)] bg-[#0B1F3A]/[0.04] px-3 py-1.5 text-xs font-bold text-[var(--theme-text-muted)] hover:border-primary-300/50 hover:text-primary-600 hover:bg-primary-500/10 disabled:opacity-50 transition-all text-left shadow-2xs"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, i) => (
          <div key={i} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%] space-y-2">
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "whitespace-pre-wrap bg-gradient-to-r from-primary-600 to-primary-500 font-medium text-white shadow-md shadow-primary-600/20"
                    : isRefusal(message.content)
                      ? "border border-shortlist-300/40 bg-shortlist-100 text-shortlist-700"
                      : "border border-[var(--theme-border)] bg-[#0B1F3A]/[0.04] text-[var(--theme-text)] space-y-2 font-medium shadow-2xs"
                }`}
              >
                {message.role === "user" ? (
                  message.content
                ) : i === messages.length - 1 ? (
                  <TypedAnswer text={message.content} />
                ) : (
                  <Markdown>{message.content}</Markdown>
                )}
              </div>

              {message.role === "assistant" && message.provider && message.provider !== "unknown" && (
                <p className="flex items-center gap-1 px-1 text-[11px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]/70">
                  <Icon
                    name="bot"
                    className="h-3 w-3"
                  />
                  via {message.provider === "gemini" ? "Gemini" : message.provider === "nvidia" ? "NVIDIA NIM" : message.provider}
                </p>
              )}

              {message.role === "assistant" && message.actions && appliedIdx !== i && (
                <div className="rounded-2xl border border-primary-300/30 bg-primary-500/10 p-3 shadow-2xs">
                  <p className="flex items-center gap-1.5 text-xs font-extrabold text-primary-600">
                    <Icon name="bot" className="h-4 w-4" />
                    Proposed shortlist changes
                  </p>
                  {message.actions.reason && (
                    <p className="mt-1 text-xs font-medium text-primary-600/80">
                      {message.actions.reason}
                    </p>
                  )}
                  <ul className="mt-2 space-y-1">
                    {message.actions.add.map((rank) => (
                      <li key={`add-${rank}`} className="flex items-center gap-1.5 text-xs font-bold text-[var(--theme-text)]">
                        <Icon name="checkCircle" className="h-3.5 w-3.5 text-shortlist-700" />
                        Add {nameForRank(rank)} (#{rank})
                      </li>
                    ))}
                    {message.actions.remove.map((rank) => (
                      <li key={`remove-${rank}`} className="flex items-center gap-1.5 text-xs font-bold text-[var(--theme-text)]">
                        <Icon name="trash" className="h-3.5 w-3.5 text-red-400" />
                        Remove {nameForRank(rank)} (#{rank})
                      </li>
                    ))}
                    {(message.actions.statusChanges || []).map(({ rank, status }) => (
                      <li key={`status-${rank}-${status}`} className="flex items-center gap-1.5 text-xs font-bold text-[var(--theme-text)]">
                        <Icon name="phone" className="h-3.5 w-3.5 text-accent-600" />
                        Move {nameForRank(rank)} (#{rank}) to {STATUS_LABELS[status] || status}
                      </li>
                    ))}
                  </ul>
                  {applyError && applyErrorIdx === i ? (
                    <p className="mt-2 text-xs font-bold text-red-600">{applyError}</p>
                  ) : null}
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApply(i)}
                      disabled={loading}
                      className="rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-3.5 py-1.5 text-xs font-bold text-white hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 shadow-xs transition-all"
                    >
                      Apply to session
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(i)}
                      className="rounded-xl border border-[var(--theme-border)] bg-[#0B1F3A]/[0.04] px-3.5 py-1.5 text-xs font-bold text-[var(--theme-text-muted)] hover:border-[var(--theme-border)] hover:text-[var(--theme-text)] shadow-2xs transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              {message.role === "assistant" && message.actions && appliedIdx === i && message.noop && (
                <p className="flex items-center gap-1.5 px-1 text-xs font-bold text-[var(--theme-text-muted)]">
                  <Icon name="checkCircle" className="h-3.5 w-3.5" />
                  Already in this state — nothing to change.
                </p>
              )}
              {message.role === "assistant" && message.actions && appliedIdx === i && !message.noop && (
                <p className="flex items-center gap-2 px-1 text-xs font-bold text-shortlist-700">
                  <span className="flex items-center gap-1.5">
                    <Icon name="checkCircle" className="h-3.5 w-3.5" />
                    Applied to this session
                  </span>
                  {message.appliedEntryId && onUndoShortlist && (
                    <button
                      type="button"
                      onClick={() => handleUndoApplied(i)}
                      className="rounded-lg border border-[var(--theme-border)] bg-[#0B1F3A]/[0.04] px-2 py-0.5 text-[12px] font-bold text-[var(--theme-text-muted)] hover:border-primary-300/50 hover:text-primary-600 shadow-2xs transition-all"
                    >
                      Undo
                    </button>
                  )}
                </p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-[var(--theme-border)] bg-[#0B1F3A]/[0.04] px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary-400 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary-400 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary-400 [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-[var(--theme-border)] p-3.5 bg-[var(--theme-card)]/60"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the copilot about the candidates..."
          disabled={loading}
          className="flex-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)]/70 px-3.5 py-2.5 text-sm text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)]/70 font-medium focus:outline-none focus:border-primary-400 transition-all shadow-2xs"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-5 py-2.5 text-sm font-bold text-white hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 shadow-md shadow-primary-600/20 transition-all"
        >
          Send
        </button>
      </form>
    </div>
  );
}
