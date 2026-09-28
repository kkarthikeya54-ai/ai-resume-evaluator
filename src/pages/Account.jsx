import { useState, useEffect, useCallback } from "react";
import Icon from "../components/ui/Icon";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES, getRoleRedirect } from "../services/role";
import DashboardHeader from "../components/DashboardHeader";
import { sendVerificationEmail, resetPassword } from "../services/auth";
import { loadUserProfile, saveUserProfile, DEFAULT_PROFILE } from "../services/userProfile";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { deleteUserAccount, functionsEnabled } from "../services/hrBackend";
import { wipeUserData } from "../services/dataWipe";

function initials(name = "", email = "") {
  const source = (name || email || "?").trim();
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function calculatePasswordStrength(pass) {
  if (!pass) return { score: 0, label: "Empty", color: "bg-[#0B1F3A]/[0.06]" };
  let score = 0;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 1) return { score: 25, label: "Weak", color: "bg-red-500" };
  if (score === 2) return { score: 50, label: "Fair", color: "bg-amber-500" };
  if (score === 3) return { score: 75, label: "Good", color: "bg-blue-500" };
  return { score: 100, label: "Strong", color: "bg-emerald-500" };
}

export default function Account() {
  const { user, role, switchRole, logout } = useAuth();
  const navigate = useNavigate();

  // Tab state: "profile" | "career" | "analytics" | "workspace"
  const [activeTab, setActiveTab] = useState("profile");

  // Profile state — initialised empty, populated from Firestore
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Academic States (Student)
  const [college, setCollege] = useState("");
  const [branch, setBranch] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [status, setStatus] = useState(DEFAULT_PROFILE.academicDetails.placementStatus);

  // HR Recruiter Details States
  const [companyName, setCompanyName] = useState("");
  const [designation, setDesignation] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [industry, setIndustry] = useState(DEFAULT_PROFILE.hrDetails.industry);
  const [companyLinkedin, setCompanyLinkedin] = useState("");
  const [hiringVolume, setHiringVolume] = useState(DEFAULT_PROFILE.hrDetails.hiringVolume);
  const [minCgpaCutoff, setMinCgpaCutoff] = useState(DEFAULT_PROFILE.hrDetails.minCgpaCutoff);
  const [primaryTechStack, setPrimaryTechStack] = useState("");
  const [recruiterBio, setRecruiterBio] = useState("");

  // Stats
  const [stats, setStats] = useState(DEFAULT_PROFILE.stats);

  // Password & Security Test Inputs
  const [testPassword, setTestPassword] = useState("");
  const passwordStrength = calculatePasswordStrength(testPassword);

  // UI States
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [pwdResetSent, setPwdResetSent] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState(null);

  const isHr = role === ROLES.HR;
  const nextRole = isHr ? ROLES.STUDENT : ROLES.HR;
  const nextLabel = isHr ? "Student" : "Hiring";

  const confirmTrapRef = useFocusTrap(confirmOpen, () => setConfirmOpen(false));
  const deleteTrapRef = useFocusTrap(deleteModalOpen, () => setDeleteModalOpen(false));

  // Load profile from Firestore when user is ready
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      const p = await loadUserProfile(user.uid);
      if (cancelled) return;
      if (p) {
        setName(p.displayName || user.displayName || "");
        setPhone(p.phone || "");
        setLocation(p.location || "");
        setTargetRole(p.targetRole || "");
        setLinkedin(p.socialLinks?.linkedin || "");
        setGithub(p.socialLinks?.github || "");
        setPortfolio(p.socialLinks?.portfolio || "");
        setCollege(p.academicDetails?.college || "");
        setBranch(p.academicDetails?.branch || "");
        setGradYear(p.academicDetails?.graduationYear || "");
        setCgpa(p.academicDetails?.cgpa || "");
        setStatus(p.academicDetails?.placementStatus || DEFAULT_PROFILE.academicDetails.placementStatus);

        setCompanyName(p.hrDetails?.companyName || "");
        setDesignation(p.hrDetails?.designation || "");
        setCompanyWebsite(p.hrDetails?.companyWebsite || "");
        setIndustry(p.hrDetails?.industry || DEFAULT_PROFILE.hrDetails.industry);
        setCompanyLinkedin(p.hrDetails?.companyLinkedin || "");
        setHiringVolume(p.hrDetails?.hiringVolume || DEFAULT_PROFILE.hrDetails.hiringVolume);
        setMinCgpaCutoff(p.hrDetails?.minCgpaCutoff || DEFAULT_PROFILE.hrDetails.minCgpaCutoff);
        setPrimaryTechStack(p.hrDetails?.primaryTechStack || "");
        setRecruiterBio(p.hrDetails?.recruiterBio || "");

        setStats(p.stats || DEFAULT_PROFILE.stats);
      } else {
        setName(user.displayName || "");
      }
      setProfileLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user?.uid, user?.displayName]);

  const buildProfile = useCallback(() => ({
    displayName: name,
    phone,
    location,
    targetRole,
    socialLinks: { linkedin, github, portfolio },
    academicDetails: {
      college,
      branch,
      graduationYear: gradYear,
      cgpa,
      placementStatus: status,
    },
    hrDetails: {
      companyName,
      designation,
      companyWebsite,
      industry,
      companyLinkedin,
      hiringVolume,
      minCgpaCutoff,
      primaryTechStack,
      recruiterBio,
    },
    stats,
  }), [
    name, phone, location, targetRole, linkedin, github, portfolio,
    college, branch, gradYear, cgpa, status,
    companyName, designation, companyWebsite, industry, companyLinkedin,
    hiringVolume, minCgpaCutoff, primaryTechStack, recruiterBio, stats
  ]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSaving(true);
    setError(null);
    try {
      await saveUserProfile(user.uid, buildProfile());
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
    }
  };

  const handleSwitch = async () => {
    setSwitching(true);
    try {
      await switchRole(nextRole);
      navigate(getRoleRedirect(nextRole));
    } catch (err) {
      setError(err.message || "Failed to switch workspace.");
      setSwitching(false);
      setConfirmOpen(false);
    }
  };

  const handleSendVerification = async () => {
    if (!user) return;
    try {
      await sendVerificationEmail(user);
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 5000);
    } catch (err) {
      setError(err.message || "Failed to send verification email.");
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      setPwdResetSent(true);
      setTimeout(() => setPwdResetSent(false), 5000);
    } catch (err) {
      setError(err.message || "Failed to send password reset email.");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== "delete") return;
    try {
      setDeleteModalOpen(false);
      setDeleteConfirmText("");
      if (functionsEnabled()) {
        try {
          await deleteUserAccount();
        } catch (err) {
          // Backend purge failed (e.g. functions not deployed) — still allow local cleanup,
          // but surface a warning so the user knows cloud data may remain.
          alert(`Cloud data removal failed: ${err.message}`.slice(0, 200));
        }
      }
      if (user?.uid) {
        await wipeUserData(user.uid);
      }
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setDeleteModalOpen(false);
      setError(err.message || "Failed to delete account.");
    }
  };

  const userInitials = initials(name, user?.email);

  return (
    <div className="min-h-screen bg-[var(--theme-bg)]/85 text-[var(--theme-text,#0f172a)] pb-16 transition-colors duration-300">
      <DashboardHeader />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header Hero */}
        <section className="rounded-3xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 sm:p-8 shadow-md flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${name || "Your"} profile photo`}
                  className="h-16 w-16 rounded-2xl object-cover border-2 border-[var(--theme-border,#e2e8f0)] shadow-md"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white font-black text-xl shadow-md">
                  {userInitials}
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1 -right-1 rounded-lg bg-[var(--theme-card,#ffffff)] border border-[var(--theme-border,#e2e8f0)] p-1 text-[var(--theme-text,#0f172a)] shadow-2xs hover:bg-[var(--theme-bg)]/85 cursor-pointer text-xs"
                title="Upload Photo"
              >
                <span className="sr-only">Upload profile photo</span>
                <Icon name="camera" className="h-5 w-5" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="sr-only"
                />
              </label>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-black border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 text-primary-600">
                  <span className="inline-flex items-center gap-1.5">{isHr ? <Icon name="building" className="h-4 w-4" /> : <Icon name="gradCap" className="h-4 w-4" />}{isHr ? "HR Recruiter Mode" : "Student Mode"}</span>
                </span>
              </div>
              <h1 className="text-2xl font-black text-[var(--theme-text,#0f172a)] mt-1">
                {name || user?.displayName || "My Profile"}
              </h1>
              <p className="text-xs font-semibold text-[var(--theme-text-muted,#475569)]">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-4 py-2 text-xs font-extrabold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Icon name="refresh" className="h-4 w-4" /> Switch to {nextLabel} Mode
            </button>
          </div>
        </section>

        {/* Tab Selection Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-[var(--theme-border,#e2e8f0)]">
          {[
            { id: "profile", label: ["user", "Basic Information"] },
            { id: "career", label: isHr ? ["building", "Recruitment Criteria"] : ["gradCap", "Academic Profile"] },
            { id: "analytics", label: ["chart", "Usage & Benchmarks"] },
            { id: "workspace", label: ["lock", "Security & Settings"] },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-primary-600 text-white shadow-xs font-black"
                  : "bg-[var(--theme-card,#ffffff)] border border-[var(--theme-border,#e2e8f0)] text-[var(--theme-text-muted,#475569)] hover:text-[var(--theme-text,#0f172a)]"
              }`}
            >
              {Array.isArray(tab.label) ? (<span className="inline-flex items-center gap-1.5"><Icon name={tab.label[0]} className="h-3.5 w-3.5" />{tab.label[1]}</span>) : tab.label}
            </button>
          ))}
        </div>

        {savedSuccess && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs font-black text-emerald-700 flex items-center gap-2">
            <span>✓</span> Profile details updated successfully!
          </div>
        )}

        {/* Tab 1: Profile Information */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="rounded-3xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 sm:p-8 shadow-md space-y-6">
              <h2 className="text-lg font-black text-[var(--theme-text,#0f172a)] border-b border-[var(--theme-border,#e2e8f0)] pb-3">Personal &amp; Contact Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="New York, NY"
                    className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">Target / Current Role</label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="Full Stack Engineer / Talent Partner"
                    className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                  />
                </div>
              </div>

              <h3 className="text-sm font-black text-[var(--theme-text,#0f172a)] pt-2 border-t border-[var(--theme-border,#e2e8f0)]">Social Profiles</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">GitHub URL</label>
                  <input
                    type="text"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">Portfolio Website</label>
                  <input
                    type="text"
                    value={portfolio}
                    onChange={(e) => setPortfolio(e.target.value)}
                    placeholder="https://portfolio.me"
                    className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving || !profileLoaded}
                  className="rounded-xl bg-primary-600 px-6 py-2.5 text-xs font-black text-white shadow-md hover:bg-primary-700 transition-all active:scale-95 cursor-pointer"
                >
                  {saving ? "Saving Changes…" : "Save Basic Info"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Role-Specific Details */}
        {activeTab === "career" && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="rounded-3xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 sm:p-8 shadow-md space-y-6">
              <h2 className="text-lg font-black text-[var(--theme-text,#0f172a)] border-b border-[var(--theme-border,#e2e8f0)] pb-3">
                {isHr ? "Corporate Recruitment Requirements" : "Academic Credentials & Placement Readiness"}
              </h2>

              {isHr ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">Company Name</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Tech Corp"
                        className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">Designation</label>
                      <input
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="Senior Technical Recruiter"
                        className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">Industry</label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                      >
                        <option value="Information Technology">Information Technology</option>
                        <option value="Finance & Fintech">Finance &amp; Fintech</option>
                        <option value="Healthcare Tech">Healthcare Tech</option>
                        <option value="E-Commerce">E-Commerce</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">Minimum CGPA Cutoff</label>
                      <input
                        type="number"
                        step="0.1"
                        value={minCgpaCutoff}
                        onChange={(e) => setMinCgpaCutoff(e.target.value)}
                        placeholder="7.5"
                        className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">Primary Tech Stack Filters</label>
                    <input
                      type="text"
                      value={primaryTechStack}
                      onChange={(e) => setPrimaryTechStack(e.target.value)}
                      placeholder="React, Node.js, Python, PostgreSQL"
                      className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">College / University</label>
                    <input
                      type="text"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      placeholder="Institute of Technology"
                      className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">Branch / Major</label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="Computer Science & Engineering"
                      className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">Graduation Year</label>
                    <input
                      type="text"
                      value={gradYear}
                      onChange={(e) => setGradYear(e.target.value)}
                      placeholder="2026"
                      className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)] mb-1">Cumulative CGPA</label>
                    <input
                      type="text"
                      value={cgpa}
                      onChange={(e) => setCgpa(e.target.value)}
                      placeholder="8.5"
                      className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving || !profileLoaded}
                  className="rounded-xl bg-primary-600 px-6 py-2.5 text-xs font-black text-white shadow-md hover:bg-primary-700 transition-all active:scale-95 cursor-pointer"
                >
                  {saving ? "Saving Details…" : "Save Role Configuration"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 3: Analytics */}
        {activeTab === "analytics" && (
          <div className="rounded-3xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 sm:p-8 shadow-md space-y-6">
            <h2 className="text-lg font-black text-[var(--theme-text,#0f172a)] border-b border-[var(--theme-border,#e2e8f0)] pb-3">Usage &amp; Benchmarks Summary</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 p-4 text-center">
                <div className="text-2xl font-black text-[var(--theme-text,#0f172a)]">{isHr ? hiringVolume : `${cgpa || "8.5"}`}</div>
                <div className="text-xs font-bold text-[var(--theme-text-muted,#475569)] uppercase mt-1">
                  {isHr ? "Annual Target" : "CGPA Score"}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 p-4 text-center">
                <div className="text-2xl font-black text-emerald-600">85%</div>
                <div className="text-xs font-bold text-[var(--theme-text-muted,#475569)] uppercase mt-1">
                  Placement Readiness Index
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 p-4 text-center">
                <div className="text-2xl font-black text-primary-700">Active</div>
                <div className="text-xs font-bold text-[var(--theme-text-muted,#475569)] uppercase mt-1">
                  System Evaluation Status
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Security & Danger Zone */}
        {activeTab === "workspace" && (
          <div className="space-y-6">
            <section className="rounded-3xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] p-6 sm:p-8 shadow-md space-y-4">
              <h2 className="text-lg font-black text-[var(--theme-text,#0f172a)] border-b border-[var(--theme-border,#e2e8f0)] pb-3">Security &amp; Password Management</h2>

              {/* Password Tester & Strength Meter */}
              <div className="space-y-2 max-w-md pt-2">
                <label className="block text-xs font-bold text-[var(--theme-text,#0f172a)]">Test Password Strength</label>
                <input
                  type="password"
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  placeholder="Enter test password..."
                  className="w-full rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-bg)]/85 px-3.5 py-2.5 text-xs font-semibold text-[var(--theme-text,#0f172a)] placeholder:text-[var(--theme-text-muted,#64748b)] focus:bg-[var(--theme-card,#ffffff)] focus:outline-none focus:border-primary-600 transition-all shadow-2xs"
                />
                {testPassword && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-[var(--theme-text,#0f172a)]">
                      <span>Strength: {passwordStrength.label}</span>
                      <span>{passwordStrength.score}%</span>
                    </div>
                    <div className="w-full bg-[var(--theme-border,#e2e8f0)] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--theme-border,#e2e8f0)]">
                <div>
                  <div className="text-xs font-bold text-[var(--theme-text,#0f172a)]">Email Verification</div>
                  <div className="text-xs text-[var(--theme-text-muted,#475569)] font-medium">{user?.emailVerified ? "Email address is verified." : "Email verification pending."}</div>
                </div>
                {!user?.emailVerified && (
                  <button
                    type="button"
                    onClick={handleSendVerification}
                    className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-xs font-extrabold text-blue-700 hover:bg-blue-500/20 hover:text-blue-800 transition-all cursor-pointer"
                  >
                    Send Verification Link
                  </button>
                )}
                {emailSent && <span className="text-xs font-bold text-emerald-700">✓ Sent!</span>}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--theme-border,#e2e8f0)]">
                <div>
                  <div className="text-xs font-bold text-[var(--theme-text,#0f172a)]">Password Reset</div>
                  <div className="text-xs text-[var(--theme-text-muted,#475569)] font-medium">Send password reset link to your account email.</div>
                </div>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="rounded-xl border border-[var(--theme-border,#e2e8f0)] bg-[var(--theme-card,#ffffff)] px-4 py-2 text-xs font-bold text-[var(--theme-text,#0f172a)] hover:bg-[var(--theme-bg)]/85 shadow-2xs transition-all cursor-pointer"
                >
                  Reset Password
                </button>
                {pwdResetSent && <span className="text-xs font-bold text-emerald-700">✓ Reset email sent!</span>}
              </div>
            </section>

            {/* Danger Zone */}
            <section className="rounded-3xl border border-red-500/30 bg-red-500/8 p-6 sm:p-8 shadow-xs space-y-4">
              <div>
                <h2 className="text-lg font-black text-red-700">Danger Zone</h2>
                <p className="text-xs font-semibold text-red-600 mt-0.5">
                  Permanently delete account and all saved resume evaluation sessions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700 shadow-xs transition-all cursor-pointer"
              >
                <Icon name="trash" className="h-4 w-4" /> Delete Account Data
              </button>
            </section>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-700">
            {error}
          </div>
        )}
      </main>

      {/* Confirmation Modal for Workspace Switch */}
      {confirmOpen && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            ref={confirmTrapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="switch-modal-title"
            className="modal-card w-full max-w-md rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-shortlist-700 text-lg">
                <Icon name="alert" className="h-10 w-10" />
              </span>
              <h3 id="switch-modal-title" className="text-lg font-black text-[var(--theme-text)]">
                Switch to {nextLabel} Workspace?
              </h3>
            </div>
            <p className="text-xs font-semibold text-[var(--theme-text-muted)] leading-relaxed">
              Switching will change your default active dashboard and workspace rules to <span className="font-extrabold text-[var(--theme-text)]">{nextLabel}</span> mode.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-2 text-xs font-bold text-[var(--theme-text-muted)] hover:bg-[#0B1F3A]/[0.04] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSwitch}
                disabled={switching}
                className="rounded-xl bg-primary-600 px-5 py-2 text-xs font-black text-white hover:bg-primary-700 shadow-md cursor-pointer"
              >
                {switching ? "Switching…" : "Confirm Switch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Double Confirmation Modal */}
      {deleteModalOpen && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            ref={deleteTrapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            className="modal-card w-full max-w-md rounded-3xl border border-red-500/30 bg-[var(--theme-card)] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-700 text-lg">
                <Icon name="trash" className="h-4 w-4" />
              </span>
              <h3 id="delete-modal-title" className="text-lg font-black text-red-700">
                Confirm Account Deletion
              </h3>
            </div>
            <p className="text-xs font-semibold text-[var(--theme-text-muted)] leading-relaxed">
              Type <code className="bg-red-500/15 text-red-700 px-1 py-0.5 rounded font-mono font-bold">DELETE</code> below to confirm permanent deletion of your data.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE..."
              className="w-full rounded-xl border border-red-500/30 bg-[var(--theme-card)]/8 px-3.5 py-2 text-xs font-bold text-[var(--theme-text)] focus:bg-[var(--theme-card)] focus:outline-none focus:border-red-600"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-2 text-xs font-bold text-[var(--theme-text-muted)] hover:bg-[#0B1F3A]/[0.04] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.toLowerCase() !== "delete"}
                className={`rounded-xl px-5 py-2 text-xs font-black shadow-md transition-all ${
                  deleteConfirmText.toLowerCase() === "delete"
                    ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                    : "bg-[var(--theme-text)]/10 text-[var(--theme-text)]/50 cursor-not-allowed"
                }`}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
