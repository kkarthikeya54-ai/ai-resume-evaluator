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
  const credential = await signInWithPopup(fbAuth, googleProvider);
  return credential.user;
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
