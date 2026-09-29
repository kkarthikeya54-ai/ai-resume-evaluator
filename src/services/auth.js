import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { auth, isConfigured } from "../config/firebase";

const googleProvider = isConfigured ? new GoogleAuthProvider() : null;

function requireAuth() {
  if (!isConfigured || !auth) {
    throw new Error(
      "Firebase is not configured. Add your Firebase project credentials to the .env file."
    );
  }
  return auth;
}

export function subscribeToAuth(callback) {
  if (!isConfigured || !auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signUp({ name, email, password }) {
  const fbAuth = requireAuth();
  const credential = await createUserWithEmailAndPassword(fbAuth, email, password);
  if (name) {
    await updateProfile(credential.user, { displayName: name });
  }
  return credential.user;
}

export async function logIn(email, password) {
  const fbAuth = requireAuth();
  const credential = await signInWithEmailAndPassword(fbAuth, email, password);
  return credential.user;
}

export async function logInWithGoogle() {
  const fbAuth = requireAuth();
  try {
    const credential = await signInWithPopup(fbAuth, googleProvider);
    return credential.user;
  } catch (err) {
    const code = err?.code || "";
    // Truly user-initiated cancellations should surface as-is.
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      throw err;
    }
    // The popup flow relays the sign-in through the Firebase auth iframe
    // (firebaseapp.com/__/auth/iframe). Under strict privacy settings
    // (Firefox dynamic state partitioning, Safari ITP) that iframe runs in a
    // third-party context with partitioned storage, so the handshake breaks
    // and the popup fails. The redirect flow is a full top-level navigation
    // and does not depend on third-party cookies, so fall back to it.
    //
    // Returns null because the page navigates away; the session is finalized
    // by AuthContext via finishRedirectLogin() when the user lands back.
    await signInWithRedirect(fbAuth, googleProvider);
    return null;
  }
}

/**
 * Finalizes a Google redirect sign-in on boot. Call once at app start:
 * resolves any pending getRedirectResult, clears Firebase's pending-redirect
 * state (so it can't re-apply on every load), and propagates the user via the
 * onAuthStateChanged session callback. Never throws.
 */
export async function finishRedirectLogin() {
  if (!isConfigured || !auth) return null;
  try {
    const credential = await getRedirectResult(auth);
    if (credential && credential.user) return credential.user;
  } catch (err) {
    // e.g. auth/account-exists-with-different-credential — the session
    // callback stays signed out and the UI can explain; boot must not fail.
    console.warn("[Auth] Redirect sign-in did not complete:", err?.code || err?.message);
  }
  return null;
}

export async function logOut() {
  if (!isConfigured || !auth) {
    console.warn("[Auth] logOut called but Firebase is not configured");
    return;
  }
  await signOut(auth);
}

export async function resetPassword(email) {
  const fbAuth = requireAuth();
  return sendPasswordResetEmail(fbAuth, email);
}

export async function sendVerificationEmail() {
  const fbAuth = requireAuth();
  const currentUser = fbAuth.currentUser;
  if (!currentUser) {
    throw new Error("You must be signed in to verify your email.");
  }
  await sendEmailVerification(currentUser);
  return currentUser.reload();
}

export function getCurrentUser() {
  if (!isConfigured || !auth) return null;
  return auth.currentUser;
}
