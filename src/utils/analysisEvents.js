export const ANALYSIS_EVENT = "airesume:run-analysis";

export const ANALYSIS_TYPES = [
  "generateSummary",
  "generateReadiness",
  "generateSkillGap",
  "generateMissingSkills",
  "generateImprovements",
  "generateProjects",
  "generateCertifications",
  "generateRoadmap",
  "generateDSA",
  "generateInterviewQuestions",
];

export function dispatchRunAnalyses(resumeText) {
  if (!resumeText) return;
  window.dispatchEvent(new CustomEvent(ANALYSIS_EVENT, { detail: { resumeText } }));
}

export function subscribeToRun(handler) {
  const listener = (e) => {
    if (e.detail?.resumeText) {
      if (typeof handler !== "function") {
        console.error("analysisEvents: bad handler", typeof handler, handler);
        return;
      }
      handler(e.detail.resumeText);
    }
  };
  window.addEventListener(ANALYSIS_EVENT, listener);
  return () => window.removeEventListener(ANALYSIS_EVENT, listener);
}
