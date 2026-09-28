const RULES = `Frontend Engineer, remote-friendly.
We need a mid-level React developer who ships accessible, responsive UI and can
collaborate with design and backend teams. Key focus areas: React performance,
state management, TypeScript, testing, CSS/design systems, and CI experience.`;

const KEYWORDS = "react, typescript, javascript, css, tailwind, testing, rest api, git, node.js, accessibility, redux, jest";

const EXPANDED_KEYWORDS = [
  "react",
  "typescript",
  "javascript",
  "css",
  "tailwind",
  "testing",
  "rest api",
  "git",
  "node.js",
  "accessibility",
  "redux",
  "jest",
  "responsive design",
  "web performance",
  "design system",
  "ci/cd",
  "frontend",
  "component library",
  "unit tests",
  "html5",
];

function sampleCandidate({
  id,
  name,
  fileName,
  rank,
  skills,
  headline,
  matched,
  missing,
  scores,
  strengths,
  concerns,
  rationale,
  resume,
}) {
  return {
    id,
    fileIndex: Number(id.split("-")[1]) - 1,
    fileName,
    fileSize: resume.length,
    fileType: "text/plain",
    resumeText: resume,
    coverage: scores.keywordMatch,
    scores,
    rank,
    evaluation: {
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      phone: "+1 555 010 0100",
      headline,
      skills,
      matchedKeywords: matched,
      missingKeywords: missing,
      strengths,
      concerns,
      rationale,
      usedFallback: false,
      sections: {
        skills: { present: true, quality: 70, note: "Dedicated skills section" },
        experience: { present: true, quality: 65, note: "Work history present" },
        education: { present: true, quality: 60, note: "Education section found" },
        projects: { present: true, quality: 75, note: "Projects with links" },
      },
    },
  };
}

const CANDIDATES = [
  sampleCandidate({
    id: "sample-1",
    name: "Alex Morgan",
    fileName: "alex-morgan.txt",
    rank: 1,
    skills: ["React", "TypeScript", "Tailwind CSS", "Jest", "Redux", "Node.js", "Git"],
    headline: "Frontend Engineer — 4 yrs React + TypeScript, design-system advocate",
    matched: ["react", "typescript", "tailwind", "testing", "jest", "rest api", "git", "node.js", "redux"],
    missing: ["accessibility"],
    scores: { skills: 85, experience: 80, education: 70, projects: 88, keywordMatch: 90, total: 84, overall: 84 },
    strengths: [
      "Deep React + TypeScript experience with a reusable component library",
      "Testing-first mindset (Jest + React Testing Library)",
      "Ship experience with CI/CD and design systems",
    ],
    concerns: ["No explicit accessibility (a11y) work mentioned", "Limited formal backend exposure"],
    rationale: "Strong senior match across every dimension; highest keyword coverage and project depth.",
    resume: `Alex Morgan
Frontend Engineer
Email: alex.morgan@example.com | Phone: +1 555 010 0100
Skills: React, TypeScript, JavaScript, Tailwind CSS, CSS, HTML5, Jest, Redux, Node.js, Git, REST API
Experience:
  Frontend Engineer at CloudKit (2022-2026) — built a design system used by 12 product teams, improved
  page-load performance by 40%, and introduced unit testing with Jest across the codebase.
Education:
  B.S. Computer Science, University of Washington (2018-2022)
Projects:
  Open-source React table library (2.1k stars) — github.com/alexmorgan/react-table
  E-commerce storefront with cart + checkout using React and Redux.`
  }),
  sampleCandidate({
    id: "sample-2",
    name: "Priya Sharma",
    fileName: "priya-sharma.txt",
    rank: 2,
    skills: ["React", "JavaScript", "CSS", "Redux", "REST API", "Git", "Node.js"],
    headline: "Full-stack leaning frontend dev with a strong eye for responsive UI",
    matched: ["react", "javascript", "css", "redux", "rest api", "git", "node.js"],
    missing: ["typescript", "tailwind", "testing", "accessibility"],
    scores: { skills: 72, experience: 68, education: 75, projects: 70, keywordMatch: 70, total: 71, overall: 71 },
    strengths: [
      "Solid React + responsive CSS portfolio",
      "Some backend exposure through Node.js",
    ],
    concerns: ["No TypeScript or automated testing experience", "No accessibility work shown"],
    rationale: "Good mid-level candidate; keyword coverage is decent but misses modern frontend signals.",
    resume: `Priya Sharma
Frontend Developer
Email: priya.sharma@example.com | Phone: +1 555 010 0101
Skills: React, JavaScript, CSS, Redux, REST API, Git, Node.js
Experience:
  Web Developer at BrightPixel (2023-2026) — delivered responsive marketing sites and admin dashboards.
Education:
  B.Tech in Information Technology, Anna University (2019-2023)
Projects:
  Job board SPA with search and filters built in React.`
  }),
  sampleCandidate({
    id: "sample-3",
    name: "James Carter",
    fileName: "james-carter.txt",
    rank: 3,
    skills: ["JavaScript", "jQuery", "PHP", "MySQL", "CSS"],
    headline: "Web developer focused on legacy stacks, new to modern tooling",
    matched: ["javascript", "css", "rest api"],
    missing: ["react", "typescript", "tailwind", "testing", "git", "node.js", "accessibility", "redux", "jest"],
    scores: { skills: 55, experience: 62, education: 68, projects: 58, keywordMatch: 30, total: 55, overall: 55 },
    strengths: ["Reliable production experience shipping customer-facing sites"],
    concerns: ["Stack is largely pre-modern (jQuery/PHP); no React or TypeScript", "Low keyword match with this role"],
    rationale: "Experience is real but the toolkit does not align with a React/TypeScript frontend role.",
    resume: `James Carter
Web Developer
Email: james.carter@example.com | Phone: +1 555 010 0102
Skills: JavaScript, jQuery, PHP, MySQL, CSS
Experience:
  Web Developer at MetroWeb (2021-2026) — maintained and extended client websites built with PHP and jQuery.
Education:
  Diploma in Web Development, Austin Community College (2019-2021)
Projects:
  Custom CMS themes and REST API integrations for client sites.`
  }),
  sampleCandidate({
    id: "sample-4",
    name: "Sofia Nguyen",
    fileName: "sofia-nguyen.txt",
    rank: 4,
    skills: ["Design", "Figma", "HTML", "CSS", "JavaScript"],
    headline: "UX-minded frontend designer with basic coding skills",
    matched: ["css", "javascript", "accessibility"],
    missing: ["react", "typescript", "tailwind", "testing", "rest api", "git", "node.js", "redux", "jest"],
    scores: { skills: 48, experience: 45, education: 70, projects: 55, keywordMatch: 30, total: 48, overall: 48 },
    strengths: ["Accessibility-aware design and HTML/CSS fundamentals", "Strong visual/UX sensibility"],
    concerns: ["No JavaScript framework experience", "Very low engineering keyword match"],
    rationale: "Candidate is closer to a designer than a frontend engineer; misses nearly all engineering signals.",
    resume: `Sofia Nguyen
UX Designer / Frontend
Email: sofia.nguyen@example.com | Phone: +1 555 010 0103
Skills: Design, Figma, HTML, CSS, JavaScript
Experience:
  UI Designer at Nova Labs (2022-2026) — designed and prototyped web interfaces in Figma.
Education:
  B.Des in Visual Communication, Rhode Island School of Design (2018-2022)
Projects:
  Accessibility audit and HTML/CSS implementation for a nonprofit site.`
  }),
];

export const SAMPLE_HR_PAYLOAD = {
  config: { rules: RULES, keywords: KEYWORDS },
  expandedKeywords: EXPANDED_KEYWORDS,
  candidates: CANDIDATES,
  failed: [],
  isSample: true,
  summary: {
    total: CANDIDATES.length,
    processed: CANDIDATES.length,
    failed: 0,
    hasGemini: true,
  },
};

export const SAMPLE_HR_NAME = "Sample · Frontend Engineer";
