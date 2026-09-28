import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES, getRoleRedirect } from "../services/role";
import ProtectedRoute from "./ProtectedRoute";

function RoleGuard({ allowedRole, fallback, children }) {
  const { role } = useAuth();

  if (allowedRole === ROLES.HR && role !== ROLES.HR) {
    return <Navigate to={fallback} replace />;
  }
  if (allowedRole === ROLES.STUDENT && role === ROLES.HR) {
    return <Navigate to={fallback} replace />;
  }
  return children;
}

export function HrRoute({ children }) {
  return (
    <ProtectedRoute>
      <RoleGuard allowedRole={ROLES.HR} fallback="/app">
        {children}
      </RoleGuard>
    </ProtectedRoute>
  );
}

export function StudentRoute({ children }) {
  return (
    <ProtectedRoute>
      <RoleGuard allowedRole={ROLES.STUDENT} fallback="/hr">
        {children}
      </RoleGuard>
    </ProtectedRoute>
  );
}

export function AuthRoute({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export function OnboardingRoute({ children }) {
  const { role } = useAuth();
  if (role) {
    return <Navigate to={getRoleRedirect(role)} replace />;
  }
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

/**
 * `/` — the app has no public landing anymore.
 * Signed-in users go straight to their role dashboard; guests go to /login.
 */
export function HomeRoute() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={role ? getRoleRedirect(role) : "/onboarding"} replace />;
}
