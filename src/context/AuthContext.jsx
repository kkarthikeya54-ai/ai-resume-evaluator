import { createContext, useContext, useEffect, useState } from "react";
import { subscribeToAuth, logOut as signOut } from "../services/auth";
import { getRole, setRole as persistRole } from "../services/role";
import { wipeUserData } from "../services/dataWipe";
import { isConfigured } from "../config/firebase";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRoleState] = useState(null);
  const [loading, setLoading] = useState(isConfigured);

  const signOutFromAuth = () => {
    signOut()
      .then(() => {
        setUser(null);
        setRoleState(null);
      })
      .catch(() => {
        // Best-effort local reset even if the network sign-out call fails.
        setUser(null);
        setRoleState(null);
      });
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuth((authUser) => {
      setUser(authUser);
      setRoleState(authUser ? getRole(authUser.uid) : null);
      setLoading(false);

      // Proactively validate/refresh the ID token once a user is present so we never
      // hold a stale credential. If the token can no longer be refreshed (revoked,
      // user disabled, network-orphaned session), sign out cleanly so the UI and any
      // downstream calls stop relying on an expired credential.
      if (authUser && authUser.getIdToken) {
        authUser
          .getIdToken(true)
          .then((token) => {
            if (typeof token === "string" && token.length > 0) return;
            // A valid auth user must yield a token string; otherwise treat as stale.
            signOutFromAuth();
          })
          .catch(() => {
            signOutFromAuth();
          });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = role || "student";
  }, [role]);

  const logout = async () => {
    await signOut();
  };

  const setRole = (nextRole, targetUid) => {
    const uid = targetUid || user?.uid;
    if (uid) {
      persistRole(uid, nextRole);
      setRoleState(nextRole);
    }
  };

  const switchRole = async (nextRole) => {
    const uid = user?.uid;
    if (!uid) return;
    await wipeUserData(uid);
    setRole(nextRole, uid);
  };

  return (
    <AuthContext.Provider
      value={{ user, role, loading, logout, setRole, switchRole, isConfigured }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
