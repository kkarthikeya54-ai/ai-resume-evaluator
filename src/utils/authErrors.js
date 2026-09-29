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
  "auth/redirect-cancelled-by-user": "Google sign-in was cancelled.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email. Sign in with your original provider.",
};

export function getAuthErrorMessage(code, fallback = "Something went wrong. Please try again.") {
  return AUTH_ERROR_MESSAGES[code] || fallback;
}
