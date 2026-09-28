import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

const USERS = "users";

const DEFAULT_PROFILE = {
  displayName: "",
  phone: "",
  location: "",
  targetRole: "",
  socialLinks: { linkedin: "", github: "", portfolio: "" },
  academicDetails: {
    college: "",
    branch: "",
    graduationYear: "",
    cgpa: "",
    placementStatus: "Actively Seeking Placement",
  },
  hrDetails: {
    companyName: "",
    designation: "",
    companyWebsite: "",
    industry: "Software & Technology",
    companyLinkedin: "",
    hiringVolume: "1-10 Candidates / Year",
    minCgpaCutoff: "7.0 CGPA",
    primaryTechStack: "",
    recruiterBio: "",
  },
  stats: {
    totalEvaluations: 0,
    topScore: 0,
    rankTier: "—",
    subSkills: {
      technicalSkills: 0,
      projectsExperience: 0,
      educationCerts: 0,
      atsCompatibility: 0,
    },
  },
};

function getRankTier(score) {
  if (score >= 90) return "S+";
  if (score >= 80) return "S";
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  return "D";
}

export async function loadUserProfile(uid) {
  if (!uid || !db) return null;
  try {
    const snap = await getDoc(doc(db, USERS, uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid,
      ...DEFAULT_PROFILE,
      ...data,
      socialLinks: { ...DEFAULT_PROFILE.socialLinks, ...(data.socialLinks || {}) },
      academicDetails: { ...DEFAULT_PROFILE.academicDetails, ...(data.academicDetails || {}) },
      hrDetails: { ...DEFAULT_PROFILE.hrDetails, ...(data.hrDetails || {}) },
      stats: { ...DEFAULT_PROFILE.stats, ...(data.stats || {}) },
    };
  } catch {
    return null;
  }
}

export async function saveUserProfile(uid, profile) {
  if (!uid || !db) throw new Error("Not authenticated");
  const { uid: _, ...data } = profile;
  await setDoc(
    doc(db, USERS, uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function recordEvaluation(uid, score, breakdown = {}) {
  if (!uid || !db) return;
  const snap = await getDoc(doc(db, USERS, uid));
  const prev = snap.exists() ? snap.data() : {};
  const prevStats = { ...DEFAULT_PROFILE.stats, ...prev.stats };

  const totalEvaluations = (prevStats.totalEvaluations || 0) + 1;
  const topScore = Math.max(prevStats.topScore || 0, score);
  const rankTier = getRankTier(topScore);

  const subSkills = { ...prevStats.subSkills };
  const keyMap = {
    technicalSkills: ["technical", "skills"],
    projectsExperience: ["projects", "experience", "projectsExperience"],
    educationCerts: ["education", "certifications", "educationCerts"],
    atsCompatibility: ["ats", "atsCompatibility", "keywords"],
  };
  for (const [target, keys] of Object.entries(keyMap)) {
    for (const k of Object.keys(breakdown)) {
      if (keys.some((alias) => k.toLowerCase().includes(alias))) {
        const entry = breakdown[k];
        const val = typeof entry === "object" && entry !== null ? entry.score : entry;
        subSkills[target] = Math.round(((Number(val) || 0) / 25) * 100);
        break;
      }
    }
  }

  await setDoc(
    doc(db, USERS, uid),
    {
      stats: { totalEvaluations, topScore, rankTier, subSkills },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export { DEFAULT_PROFILE };
