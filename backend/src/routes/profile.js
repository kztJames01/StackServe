const { Router } = require('express');
const { listEntities, applyPagination } = require('../db/repository');
const { query } = require('../db/pool');
const { requireAuth } = require('../middleware/validate');
const { getOwnProfile, updateOwnProfile, publicProfile } = require('../services/identity');

const router = Router();
const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

router.get('/profile', requireAuth, route(async (req, res) => {
  res.json(await getOwnProfile(req.user));
}));

router.patch('/profile', requireAuth, route(async (req, res) => {
  const result = await updateOwnProfile(req.user, req.body);
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  res.json(result);
}));

router.get('/profiles/:handle', route(async (req, res) => {
  const result = await query('SELECT p.*, u.roles FROM profiles p JOIN users u ON u.id = p.id WHERE p.handle = $1', [req.params.handle.toLowerCase()]);
  if (!result.rows[0]) return res.status(404).json({ message: 'Profile not found' });
  res.json(publicProfile(result.rows[0]));
}));

router.get('/profile/projects', requireAuth, route(async (req, res) => {
  const items = await listEntities('projects', { paginate: false, filter: (project) => project.ownerId === req.user.uid });
  res.json(applyPagination(items, req.query.page, req.query.limit));
}));

module.exports = router;
