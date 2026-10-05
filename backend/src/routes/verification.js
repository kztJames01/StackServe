const { Router } = require('express');
const { query } = require('../db/pool');
const { requireAuth } = require('../middleware/validate');
const { ensureIdentity, getOwnProfile } = require('../services/identity');

const router = Router();
const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
const trusted = (req, res, next) => {
  if (!req.user?.verifiedToken) return res.status(503).json({ message: 'Verified Firebase authentication is required.' });
  next();
};

router.get('/verification', requireAuth, route(async (req, res) => {
  const profile = await getOwnProfile(req.user);
  res.json({
    studentStatus: profile.studentStatus,
    employerStatus: profile.employerStatus,
    isAdmin: profile.isAdmin,
    providers: { sheerId: false, employer: false },
    universityEmailEligible: req.user.verifiedToken === true && req.user.emailVerified === true && /@[^@]+\.edu$/i.test(req.user.email || ''),
  });
}));

router.post('/verification/student', requireAuth, trusted, route(async (req, res) => {
  const domain = (req.user.email || '').split('@')[1]?.toLowerCase();
  if (!req.user.emailVerified || !domain?.endsWith('.edu')) {
    return res.status(400).json({ message: 'Verify your university .edu email with Firebase first.' });
  }
  await ensureIdentity(req.user);
  await query("UPDATE profiles SET student_status = 'verified', university_domain = $2, updated_at = NOW() WHERE id = $1", [req.user.uid, domain]);
  res.json({ message: 'Student verified', studentStatus: 'verified' });
}));

router.post('/verification/student/sheerid', requireAuth, (_req, res) => {
  res.status(503).json({ message: 'SheerID is not configured.' });
});

router.post('/verification/employer', requireAuth, (_req, res) => {
  res.status(503).json({ message: 'Employer verification is not configured.' });
});

module.exports = router;
