# Copilot

> 🧠 AI Pipeline · Prev: [Ranking Math](./ranking-math.md)

The Recruiter Copilot (`HrChatPanel` UI, `services/hrChat.js` logic) — a chat that answers **only** from the session's candidate data.

## The pipeline

```
question
  ▼
selectChatContext(candidates, question, 12 000 chars)
    tokenize question → [a-z][a-z0-9]{2,}
    score each candidate: term hits across
      name · fileName · headline · skills · matchedKeywords
      · strengths · concerns · resumeText
    tie-break by rank, then index
    pack best blocks (formatCandidateBlock) under 12 000 chars
  ▼
buildChatPrompt({rules, keywords, corpus, history, question})
  grounding contract + job rules + expanded keywords
  + corpus + last 16 turns + QUESTION
  ▼
GeminiService.hrChat(prompt)     // json:false → raw text answer
  ▼
Markdown.jsx renders the answer in the chat panel
```

## The grounding contract (in the prompt)

> You ONLY answer questions about the uploaded candidate resumes and the job requirements… Ground every answer strictly in the provided data. **Never invent details about a candidate.** If a question is unrelated… respond with exactly: *"I can only answer questions about the uploaded resumes and this job's requirements."*

Design properties:

- **Relevance-selected, not exhaustive.** A 100-candidate session doesn't dump 100 resumes into the prompt — the question picks the corpus. Small prompts stay fast and cheap.
- **Deterministic off-topic reply** — the exact sentence is enforced in the prompt and used as the fallback in code (`answer || OFF_TOPIC_REPLY`), so the UI can rely on it.
- **History window of 16 turns** — enough conversational context, bounded prompt growth.
- **Evidence formatting** — `formatCandidateBlock` gives the model the same structured text recruiters see (scores, keywords, strengths, concerns, rationale), which is what makes verifiable answers possible.

## Known limits (by design)

- No streaming — answers arrive complete (the chat panel shows a typing indicator instead).
- No cross-session memory — the copilot sees only the open session's data.
- No write actions — it advises; shortlists/statuses stay human decisions.

---

**Related pages:** [Ranking Math](./ranking-math.md) · [Services → HR Pipeline & Copilot](../services/hr-pipeline.md) · [Frontend → Components → HrChatPanel](../frontend/components.md)
