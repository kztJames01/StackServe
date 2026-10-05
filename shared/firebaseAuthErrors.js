// maps firebase auth error codes to short user-facing text
const MESSAGES = {
  'auth/email-already-in-use': 'That email is already registered. Try signing in instead.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled for this app. Check Firebase console.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-login-credentials': 'Wrong email or password.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/invalid-api-key': 'Firebase API key is invalid. Check your env config.',
  'auth/app-not-authorized': 'This app is not authorized for Firebase. Check console settings.',
  'auth/configuration-not-found': 'Firebase project config is missing or wrong.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'Pop-up was blocked. Allow pop-ups for this site or try again.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
  'auth/account-exists-with-different-credential': 'That email already uses a different sign-in method. Try email/password or the other provider.',
  'auth/credential-already-in-use': 'This account is already linked to another user.',
  'auth/unauthorized-domain': 'This site is not authorized in Firebase. Add your domain in the Firebase console.',
  'auth/operation-not-supported-in-this-environment': 'This sign-in method is not supported in this browser.',
};

function getFirebaseAuthErrorMessage(error, fallback = 'Something went wrong. Try again.') {
  if (!error) return fallback;
  const code =
    (typeof error === 'object' && error && 'code' in error && String(error.code)) ||
    (typeof error === 'object' && error && 'errorCode' in error && String(error.errorCode)) ||
    '';
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    const msg = error.message;
    if (msg.includes('Firebase: Error')) {
      return fallback;
    }
    return msg;
  }
  return fallback;
}

module.exports = { getFirebaseAuthErrorMessage, MESSAGES };
