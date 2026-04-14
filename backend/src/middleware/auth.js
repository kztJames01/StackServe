//firebase auth middleware - verifies firebase id tokens with bearer -> success -> attach user info
const admin = require('firebase-admin');
let firebaseInitialised = false;
let firebaseUnavailable = false;

function initFirebase() {
  if (firebaseInitialised || firebaseUnavailable) return;

  try {
    //a single JSON env var containing the full service-account object.
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      console.warn(
        '[auth] Firebase credentials not configured. ' +
          'Token verification is disabled; req.user will be null.'
      );
      firebaseUnavailable = true;
      return;
    }

    firebaseInitialised = true;
  } catch (err) {
    console.error('[auth] Failed to initialise Firebase Admin SDK:', err.message);
    firebaseUnavailable = true;
  }
}

/**
 * Express middleware that optionally verifies a Firebase ID token.
 */
async function authMiddleware(req, res, next) {
  initFirebase();

  const authHeader = req.headers['authorization'] || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  // No token provided — treat as anonymous; individual routes can enforce auth.
  if (!match) {
    req.user = null;
    return next();
  }

  // Firebase credentials are not configured — cannot verify.
  if (firebaseUnavailable) {
    req.user = null;
    return next();
  }

  const idToken = match[1];

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: decoded.name ?? decoded.display_name ?? null,
    };
    next();
  } catch (err) {
    // Do not leak internal error details to the client.
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
