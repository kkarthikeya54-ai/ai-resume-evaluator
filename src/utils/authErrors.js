const AUTH_ERROR_MESSAGES = {
  "auth/invalid-credential": "Invalid email or password.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password is too weak. Use at least 6 characters.",
  "auth/operation-not-allowed": "This sign-in method is not enabled.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  "auth/cancelled-popup-request": "Google sign-in was cancelled.",
  "auth/popup-blocked":
    "Google sign-in popup was blocked. Allow popups for this site and try again.",
  "auth/redirect-cancelled-by-user": "Google sign-in was cancelled.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email. Sign in with your original provider.",
};

// Google sign-in (popup) relays credentials through a cross-origin Firebase
// auth iframe, so it needs cross-site cookies. Browsers with partitioned or
// blocked third-party storage (Firefox Enhanced Tracking Protection / Total
// Cookie Protection, Safari ITP) break it regardless of server config. There
// is no in-app workaround for that environment — the user must either allow
// the site's cookies or use email/password (which is fully first-party).
const PRIVACY_HINT =
  " Google sign-in needs cross-site cookies, and your browser appears to be blocking or partitioning them (privacy settings like Firefox's Enhanced Tracking Protection). Click the shield icon in the address bar and turn off protection for this site, then try again — or sign in with Email & Password above.";

// Fire these without the hint when the user obviously cancelled.
const USER_CANCELLED_CODES = new Set([
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/redirect-cancelled-by-user",
]);

export function getAuthErrorMessage(code, fallback = "Something went wrong. Please try again.") {
  return AUTH_ERROR_MESSAGES[code] || fallback;
}

/** Error message for the Google sign-in button, with privacy guidance when relevant. */
export function getGoogleAuthErrorMessage(err) {
  const code = err?.code || "";
  if (USER_CANCELLED_CODES.has(code)) {
    return AUTH_ERROR_MESSAGES[code];
  }
  const known = AUTH_ERROR_MESSAGES[code];
  if (known) return known;
  // Partitioned/blocked third-party storage fails the popup handshake with
  // no specific Firebase code — exactly the "bounced back instantly" case.
  return "Google sign-in failed." + PRIVACY_HINT;
}