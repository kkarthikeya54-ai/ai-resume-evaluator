/**
 * Fast local resume scoring — zero AI calls, zero tokens.
 *
 * Bulk runs (100-500 resumes) previously stalled on AI batch calls that
 * take 30-120 s EACH on free-tier proxies. This scorer extracts the same
 * signal a recruiter screens for — skills breadth, experience, education
 * level, projects, keyword coverage — from the already-extracted resume
 * text, in microseconds per file. Quality is honest and explainable
 * (matched skills/keywords are listed), just shallower than AI review.
 *
 * Used automatically for every run by default (see FAST_LOCAL_THRESHOLD in
 * hrScoring.js — the local engine replaced free-tier AI batch calls, which
 * measured 90-300+ s per batch and routinely timed out). Opt into AI
 * evaluation per run with mode:"ai" when a healthy AI endpoint exists.
 */

/* Broad skill dictionary — matched as whole phrases, case-insensitive. */
const SKILLS = [
  // languages
  "javascript", "typescript", "python", "java", "c++", "c#", "go", "rust", "kotlin", "swift",
  "php", "ruby", "r language", "scala", "dart", "sql", "bash", "shell scripting", "matlab",
  // web
  "html", "css", "react", "angular", "vue", "next.js", "node.js", "express", "django", "flask",
  "fastapi", "spring boot", "asp.net", "tailwind", "bootstrap", "rest api", "graphql", "websocket",
  // data / ml
  "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "keras", "opencv", "nlp",
  "machine learning", "deep learning", "data analysis", "data visualization", "power bi",
  "tableau", "excel", "hadoop", "spark", "postgresql", "mysql", "mongodb", "firebase",
  "redis", "sqlite", "dynamodb",
  // cloud / devops
  "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "ci/cd", "git", "github",
  "gitlab", "linux", "nginx", "terraform", "jira",
  // mobile
  "android", "ios", "react native", "flutter",
  // practices / soft
  "agile", "scrum", "testing", "selenium", "jest", "cypress", "unit testing", "debugging",
  "problem solving", "communication", "leadership", "teamwork", "public speaking",
  "time management", "microsoft office", "figma", "ui/ux",
];

const DEGREE_LEVELS = [
  { re: /\b(ph\.?d|doctorate)\b/i, score: 100, label: "PhD" },
  { re: /\b(m\.?tech|m\.?e\b|m\.?sc|master|mba|post.?graduat)/i, score: 85, label: "Master's" },
  { re: /\b(b\.?tech|b\.?e\b|bachelor|b\.?sc|b\.?ca|undergraduat|degree)/i, score: 70, label: "Bachelor's" },
  { re: /\b(diploma|associate)\b/i, score: 50, label: "Diploma" },
];

const PROJECT_SIGNALS = /\b(project|built|developed|created|designed|deployed|implemented|github\.com|live demo|portfolio)\b/gi;
const EXPERIENCE_SIGNALS = /\b(internship|intern|freelance|part.?time|work.?from.?home|employment|work experience|professional experience)\b/gi;
const LEADERSHIP_SIGNALS = /\b(lead|led|captain|president|coordinator|manager|mentor|organized|head of)\b/gi;

function clamp(n, max = 100) {
  return Math.max(0, Math.min(max, Math.round(Number(n) || 0)));
}

export function detectSkills(text) {
  const lower = ` ${String(text || "").toLowerCase()} `;
  return SKILLS.filter((skill) => lower.includes(` ${skill} `) || lower.includes(`${skill},`) || lower.includes(`${skill}.`));
}

export function matchKeywords(text, keywords) {
  const lower = String(text || "").toLowerCase();
  const list = (keywords || []).map((k) => String(k).trim().toLowerCase()).filter(Boolean);
  const matched = list.filter((k) => lower.includes(k));
  return { matched, missing: list.filter((k) => !matched.includes(k)) };
}

export function detectYearsExperience(text) {
  const t = String(text || "");
  let maxYears = 0;
  for (const m of t.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)/gi)) {
    const n = parseInt(m[1], 10);
    if (n > 0 && n <= 40) maxYears = Math.max(maxYears, n);
  }
  // Date ranges like 2021 - 2023 / 2021-present
  for (const m of t.matchAll(/(20\d{2})\s*[-–to]+\s*(20\d{2}|present|current)/gi)) {
    const end = /present|current/i.test(m[2]) ? new Date().getFullYear() : parseInt(m[2], 10);
    const span = end - parseInt(m[1], 10);
    if (span > 0 && span <= 40) maxYears = Math.max(maxYears, span);
  }
  return maxYears;
}

export function detectDegree(text) {
  for (const level of DEGREE_LEVELS) {
    if (level.re.test(text)) return level;
  }
  return null;
}

function countMatches(text, re) {
  const found = String(text || "").match(re);
  return found ? Math.min(found.length, 8) : 0;
}

export function guessNameFromFileName(fileName) {
  const base = String(fileName || "")
    .replace(/\.[^.]+$/, "")
    .replace(/^(resume|cv|profile)[-_ ]?\d*[-_ ]?/i, "")
    .replace(/\d{1,4}[-_ ]+/g, "")
    .replace(/[-_]+/g, " ")
    .trim();
  if (!base) return "";
  return base
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Score one resume. Returns the same shape the AI evaluation produces
 * (name/email/headline/skills/ratings/…), plus `local: true`.
 */
export function localEvaluate({ resumeText, fileName, keywords, rules }) {
  const text = String(resumeText || "");
  const skillsFound = detectSkills(text);
  const { matched, missing } = matchKeywords(text, keywords);
  const coverage = keywords?.length ? Math.round((matched.length / keywords.length) * 100) : 0;
  const years = detectYearsExperience(text);
  const degree = detectDegree(text);
  const projectHits = countMatches(text, PROJECT_SIGNALS);
  const experienceHits = countMatches(text, EXPERIENCE_SIGNALS);
  const leadershipHits = countMatches(text, LEADERSHIP_SIGNALS);

  const hasSection = (re) => re.test(text);
  const sectionSkills = hasSection(/\b(skills?|technical skills|technologies)\b/i);
  const sectionExp = hasSection(/\b(experience|work history|employment)\b/i);
  const sectionEdu = hasSection(/\b(education|academic)\b/i);
  const sectionProj = hasSection(/\b(projects?|portfolio)\b/i);

  /* Calibrated so typical resumes land in the 35-75 band with real spread:
     - skills: saturates at 18 distinct skills (~80 pts), not 13
     - experience: years*12 (5y ≈ 60), modest signal bonuses
     - projects: max ~72 even with many project verbs
     - keyword coverage stays a true percentage. */
  const skillScore = clamp((Math.min(skillsFound.length, 18) / 18) * 80 + (sectionSkills ? 10 : 0) + coverage * 0.1, 100);
  const expScore = clamp(years * 12 + experienceHits * 6 + leadershipHits * 5 + (sectionExp ? 10 : 0), 95);
  const eduScore = degree ? clamp(degree.score + (sectionEdu ? 8 : 0), 100) : clamp(sectionEdu ? 35 : 15, 100);
  const projScore = clamp(Math.min(projectHits, 5) * 12 + (sectionProj ? 12 : 0), 100);
  const keywordScore = clamp(coverage, 100);

  const total = Math.round(
    skillScore * 0.25 + expScore * 0.25 + eduScore * 0.15 + projScore * 0.15 + keywordScore * 0.2
  );

  const email = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] || "";
  const phone = text.match(/(?:\+?\d[\d\s-]{8,12}\d)/)?.[0]?.trim() || "";
  const headline = text
    .split(/\n+/)
    .map((l) => l.trim())
    .find((l) => l.length > 3 && l.length <= 90 && !/^(name|email|phone|resume|curriculum)/i.test(l)) || "";

  const strengths = [];
  if (skillsFound.length >= 6) strengths.push(`Broad skill set (${skillsFound.slice(0, 6).join(", ")}…)`);
  if (years >= 1) strengths.push(`~${years} year(s) of experience detected`);
  if (degree) strengths.push(`${degree.label}-level education`);
  if (projectHits >= 3) strengths.push("Multiple hands-on projects listed");
  if (coverage >= 60) strengths.push(`Strong keyword match (${coverage}%)`);

  const concerns = [];
  if (missing.length) concerns.push(`Missing keywords: ${missing.slice(0, 4).join(", ")}`);
  if (!sectionExp) concerns.push("No clear experience section found");
  if (!degree) concerns.push("Education level not clearly stated");
  if (projectHits < 2) concerns.push("Few concrete projects detected");

  return {
    name: guessNameFromFileName(fileName) || headline.slice(0, 40) || "",
    email,
    phone,
    headline,
    skills: skillsFound.slice(0, 12),
    matchedKeywords: matched,
    missingKeywords: missing,
    sections: {
      skills: { present: sectionSkills, quality: sectionSkills ? 70 : 0, note: sectionSkills ? "Section found" : "Section not found" },
      experience: { present: sectionExp, quality: sectionExp ? 65 : 0, note: sectionExp ? "Section found" : "Section not found" },
      education: { present: sectionEdu, quality: sectionEdu ? 70 : 0, note: sectionEdu ? "Section found" : "Section not found" },
      projects: { present: sectionProj, quality: sectionProj ? 65 : 0, note: sectionProj ? "Section found" : "Section not found" },
    },
    ratings: {
      skills: skillScore,
      experience: expScore,
      education: eduScore,
      projects: projScore,
      keywordMatch: keywordScore,
      overall: clamp(total, 100),
    },
    strengths,
    concerns,
    rationale: `Fast local scoring — ${skillsFound.length} skills matched, ${matched.length}/${keywords?.length || 0} keywords hit, ~${years} yr experience, ${degree ? degree.label : "education unspecified"}. Rules context: ${(rules || "").slice(0, 80) || "n/a"}`,
    local: true,
  };
}
