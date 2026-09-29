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
  // Server/config-side failures — the user's browser isn't at fault.
  "auth/unauthorized-domain":
    "Google sign-in isn't set up for this domain. Ask the site owner to add it in Firebase Authentication → Settings → Authorized domains.",
  "auth/if-invalid-origin":
    "Google sign-in couldn't verify this page's origin. Ask the site owner to add this domain in Firebase Authentication → Settings → Authorized domains.",
  "auth/network-request-failed":
    "A network error interrupted sign-in. Check your connection and try again.",
};

// Google sign-in (popup) relays credentials through a cross-origin Firebase
// auth iframe and pop-up, so it needs third-party requests AND cross-site
// cookies. Browsers with partitioned/blocked third-party storage (Firefox
// Enhanced Tracking Protection, Safari ITP) and ad-blocker extensions all
// break it regardless of server config. Email/password is fully first-party
// and always works in those environments.
const PRIVACY_HINT =
  " Google sign-in needs cross-site cookies and third-party pop-ups, which ad blockers and privacy settings often block (e.g. an ad-blocker extension, or Firefox's Enhanced Tracking Protection). Add an exception for this site in your ad blocker, or turn off protection from the shield icon in the address bar — then try again. You can also sign in with Email & Password above.";

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
  // Log the raw error so an unrecognized code is still diagnosable.
  console.warn("[Auth] Google sign-in failed with unrecognized code:", err);
  return "Google sign-in failed." + PRIVACY_HINT;
}