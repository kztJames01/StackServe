//firebase auth middleware - verifies firebase id tokens with bearer -> success -> attach user info
const admin = require('firebase-admin');
let firebaseInitialised = false;
let firebaseUnavailable = false;

// local dev only, no signature check
function userFromJwtPayload(idToken) {
  if (process.env.NODE_ENV === 'production') return null;
  const chunks = String(idToken).split('.');
  if (chunks.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(chunks[1], 'base64url').toString('utf8'));
    const uid = payload.user_id || payload.sub;
    if (!uid) return null;
    const provider = payload.firebase?.sign_in_provider || null;
    return {
      uid,
      email: payload.email ?? null,
      name: payload.name ?? payload.display_name ?? null,
      signInProvider: provider,
    };
  } catch {
    return null;
  }
}

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

  const idToken = match[1];

  if (firebaseUnavailable) {
    req.user = userFromJwtPayload(idToken);
    return next();
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: decoded.name ?? decoded.display_name ?? null,
      emailVerified: decoded.email_verified === true,
      admin: decoded.admin === true,
      verifiedToken: true,
      signInProvider: decoded.firebase?.sign_in_provider ?? null,
    };
    next();
  } catch (err) {
    const code = err && err.code ? String(err.code) : '';
    if (code === 'auth/id-token-expired') {
      return res.status(401).json({
        message: 'Your session expired. Sign in again.',
        code: 'TOKEN_EXPIRED',
      });
    }
    if (code === 'auth/id-token-revoked') {
      return res.status(401).json({
        message: 'Your session was revoked. Sign in again.',
        code: 'TOKEN_REVOKED',
      });
    }
    return res.status(401).json({ message: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
}

function getAuthMode() {
  initFirebase();
  if (firebaseInitialised) return 'firebase-admin';
  if (firebaseUnavailable) {
    return process.env.NODE_ENV === 'production' ? 'unconfigured' : 'dev-jwt-decode';
  }
  return 'unknown';
}

async function verifyAuthToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;
  initFirebase();
  if (firebaseUnavailable) return userFromJwtPayload(idToken);
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: decoded.name ?? decoded.display_name ?? null,
      emailVerified: decoded.email_verified === true,
      admin: decoded.admin === true,
      verifiedToken: true,
      signInProvider: decoded.firebase?.sign_in_provider ?? null,
    };
  } catch {
    return null;
  }
}

module.exports = authMiddleware;
module.exports.verifyAuthToken = verifyAuthToken;
module.exports.initFirebase = initFirebase;
module.exports.getAuthMode = getAuthMode;
