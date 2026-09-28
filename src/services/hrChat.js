import { GeminiService } from "./gemini";
import { selectChatContext } from "./hrScoring";
import { SHORTLIST_ACTION_PROMPT } from "./copilotActions";

const OFF_TOPIC_REPLY =
  "I can only answer questions about the uploaded resumes and this job's requirements.";

export function buildChatPrompt({ rules, keywords, corpus, history, question }) {
  const conversation = (history || [])
    .slice(-16)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  return `You are an HR recruiting assistant for this hiring team. You help the team screen, compare, and decide on the candidates in the data below.

SCOPE — answer any question that is about:
- The uploaded candidate resumes: ranks, scores, skills, experience, education, projects, strengths, concerns, comparisons, summaries, shortlist recommendations.
- This job opening: its requirements, criteria, and target keywords.
- Anything grounded in the data below, including follow-ups on earlier answers.

Each candidate block is numbered by rank ("1." = rank #1, "2." = rank #2, ...). When the user refers to a position — e.g. "the 10th candidate", "rank 3", "the top 3", "the worst one" — the relevant candidate data IS included below; find the matching numbered block and answer from it. Never say you lack data for a rank that has a block.

If and ONLY if the question is clearly unrelated to hiring, these candidates, and this job — e.g. the weather, general knowledge, coding help, homework, chit-chat — respond with exactly:
${OFF_TOPIC_REPLY}

If a question is ambiguous but could plausibly relate to the candidates or the job, answer the most relevant interpretation instead of refusing.

SHORTLIST & PIPELINE DECISIONS:
The team may ask you to act, e.g. "shortlist the top 3", "remove the weakest", "move #2 to interviewing", "mark #1 as hired", "update my shortlist". When your answer recommends a shortlist change or a candidate's pipeline stage, end it with the machine-readable block below so the workspace can apply your decision after one explicit confirmation. Never include the block for purely informational answers — only when a pipeline change is being recommended.
${SHORTLIST_ACTION_PROMPT}

JOB RULES:
"""
${rules || "(none provided)"}
"""

JOB KEYWORDS (original and expanded):
"""
${(keywords || []).join(", ") || "(none provided)"}
"""

CANDIDATE EVALUATIONS (numbered by rank):
"""
${corpus}
"""

${conversation ? `PREVIOUS CONVERSATION:\n${conversation}\n` : ""}
QUESTION: ${question}
ANSWER:`;
}

export async function askHrChat({ rules, keywords, candidates, history, question }) {
  const corpus = selectChatContext(candidates, question);
  const prompt = buildChatPrompt({ rules, keywords, corpus, history, question });
  // The worker reports which provider served the request via the meta
  // callback; default to "unknown" for cached/legacy responses without one.
  let provider = null;
  const answer = await GeminiService.hrChat(prompt, (meta) => {
    if (meta && meta.provider) provider = meta.provider;
  });
  return {
    answer: answer || OFF_TOPIC_REPLY,
    provider: provider || "unknown",
  };
}
