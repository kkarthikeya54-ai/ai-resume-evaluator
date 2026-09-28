export const ROLES = {
  STUDENT: "student",
  HR: "hr",
};

const ROLE_KEY = (uid) => `airesume_role_${uid}`;

export function getRole(uid) {
  if (!uid) return null;
  try {
    const role = localStorage.getItem(ROLE_KEY(uid));
    return role === ROLES.HR || role === ROLES.STUDENT ? role : null;
  } catch {
    return null;
  }
}

export function setRole(uid, role) {
  if (!uid) return;
  try {
    localStorage.setItem(ROLE_KEY(uid), role === ROLES.HR ? ROLES.HR : ROLES.STUDENT);
  } catch {
    // best-effort
  }
}

export function clearRole(uid) {
  if (!uid) return;
  try {
    localStorage.removeItem(ROLE_KEY(uid));
  } catch {
    // best-effort
  }
}

export function getRoleRedirect(role) {
  return role === ROLES.HR ? "/hr" : "/app";
}
