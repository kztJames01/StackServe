const { Router } = require('express');
const { z } = require('zod');
const { query } = require('../db/pool');
const { getEntityById, upsertEntity } = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { ensureIdentity, getOwnProfile } = require('../services/identity');

const router = Router();
const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
const trusted = (req, res, next) => {
  if (!req.user?.verifiedToken) return res.status(503).json({ message: 'Verified Firebase authentication is required. Configure Firebase Admin credentials.' });
  next();
};
const staff = (req, res, next) => {
  if (!req.user?.verifiedToken || req.user.admin !== true) return res.status(403).json({ message: 'Staff authorization required' });
  next();
};
const domainSchema = z.string().trim().toLowerCase().max(253).regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/);
const investorSchema = z.object({
  orgDomain: domainSchema,
  checkSize: z.string().trim().min(1).max(100),
  stage: z.string().trim().min(1).max(100),
  aumRange: z.string().trim().min(1).max(100),
  thesis: z.string().trim().min(20).max(2000),
  portfolio: z.array(z.string().trim().min(1).max(120)).max(50),
  focusAreas: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
}).strict();

router.get('/verification', requireAuth, route(async (req, res) => {
  const profile = await getOwnProfile(req.user);
  const investor = await getEntityById('investors', req.user.uid);
  res.json({ studentStatus: profile.studentStatus, employerStatus: profile.employerStatus,
    investor: investor || null, isAdmin: profile.isAdmin,
    providers: { sheerId: false, employer: false },
    universityEmailEligible: req.user.verifiedToken === true && req.user.emailVerified === true && /@[^@]+\.edu$/i.test(req.user.email || '') });
}));

router.post('/verification/student', requireAuth, trusted, route(async (req, res) => {
  const domain = (req.user.email || '').split('@')[1]?.toLowerCase();
  if (!req.user.emailVerified || !domain?.endsWith('.edu')) {
    return res.status(400).json({ message: 'Verify your university .edu email with Firebase first. SheerID verification is not configured yet.' });
  }
  await ensureIdentity(req.user);
  await query("UPDATE profiles SET student_status = 'verified', university_domain = $2, updated_at = NOW() WHERE id = $1", [req.user.uid, domain]);
  res.json({ message: 'Student Maker verified', studentStatus: 'verified' });
}));

router.post('/verification/student/sheerid', requireAuth, (_req, res) => {
  res.status(503).json({ message: 'SheerID is not configured. Program configuration and API access are required.' });
});

router.post('/verification/employer', requireAuth, (_req, res) => {
  res.status(503).json({ message: 'Employer verification is unavailable until domain verification and the selected employer provider are both configured.' });
});

router.post('/verification/investor', requireAuth, trusted, route(async (req, res) => {
  const parsed = investorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ') });
  const profile = await getOwnProfile(req.user);
  if (!profile.roles.includes('investor')) return res.status(400).json({ message: 'Add the investor account role before requesting review.' });
  const domain = (req.user.email || '').split('@')[1]?.toLowerCase();
  if (!req.user.emailVerified || domain !== parsed.data.orgDomain) return res.status(400).json({ message: 'Your verified account email must match the organization domain.' });
  const existing = await getEntityById('investors', req.user.uid);
  await upsertEntity('investors', { ...existing, ...parsed.data, id: req.user.uid, userId: req.user.uid,
    name: profile.name, bio: profile.bio, avatar: profile.avatar, status: 'pending',
    reviewNote: '', reviewedBy: null, reviewedAt: null, domainVerified: true, submittedAt: new Date().toISOString() });
  res.status(202).json({ message: 'Submitted for staff review. Your investor profile will not be featured until approved.' });
}));

router.get('/verification/investors/review', requireAuth, staff, route(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const result = await query(`SELECT id, name, org_domain AS "orgDomain", stage, check_size AS "checkSize",
    aum_range AS "aumRange", thesis, data->'portfolio' AS portfolio, data->>'submittedAt' AS "submittedAt", created_at AS "createdAt"
    FROM investor_profiles WHERE status = 'pending' ORDER BY updated_at ASC LIMIT $1 OFFSET $2`, [limit, (page - 1) * limit]);
  res.json(result.rows);
}));

router.patch('/verification/investors/:id/review', requireAuth, staff, route(async (req, res) => {
  const parsed = z.object({ decision: z.enum(['verified', 'rejected']), note: z.string().trim().min(1).max(2000), submittedAt: z.string() }).strict().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Decision, review note, and submission version are required.' });
  if (req.params.id === req.user.uid) return res.status(403).json({ message: 'You cannot review your own credentials.' });
  await ensureIdentity(req.user);
  const result = await query(`UPDATE investor_profiles SET status = $2, review_note = $3, reviewed_by = $4,
    reviewed_at = NOW(), updated_at = NOW() WHERE id = $1 AND status = 'pending'
    AND data->>'submittedAt' = $5 AND data->>'domainVerified' = 'true' RETURNING id`,
  [req.params.id, parsed.data.decision, parsed.data.note, req.user.uid, parsed.data.submittedAt]);
  if (!result.rows[0]) return res.status(409).json({ message: 'Submission changed or has already been reviewed. Refresh the queue.' });
  res.json({ message: 'Review recorded' });
}));

module.exports = router;
