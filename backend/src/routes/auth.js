const { Router } = require('express');
const { requireAuth } = require('../middleware/validate');
const { getOwnProfile, ensureIdentity } = require('../services/identity');
const { getAuthMode } = require('../middleware/auth');

const router = Router();

// tells the web app which oauth providers firebase should expose
router.get('/auth/config', (_req, res) => {
  const mode = getAuthMode();
  const firebaseOk = mode === 'firebase-admin' || mode === 'dev-jwt-decode';
  res.json({
    google: firebaseOk && process.env.AUTH_GOOGLE_ENABLED !== '0',
    apple: firebaseOk && process.env.AUTH_APPLE_ENABLED !== '0',
    authMode: mode,
  });
});

// call right after firebase popup/redirect sign-in so postgres user + profile exist
router.post('/auth/sync', requireAuth, async (req, res, next) => {
  try {
    await ensureIdentity(req.user);
    const profile = await getOwnProfile(req.user);
    res.json({
      ok: true,
      signInProvider: req.user.signInProvider || null,
      profile: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        handle: profile.handle,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
