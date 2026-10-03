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
  const profile = publicProfile(result.rows[0]);
  const investor = await query(`SELECT name, stage, org_domain, check_size, aum_range, thesis, data->'portfolio' AS portfolio
    FROM investor_profiles WHERE owner_id = $1 AND status = 'verified'`, [result.rows[0].id]);
  if (investor.rows[0]) profile.investor = investor.rows[0];
  res.json(profile);
}));

router.get('/profile/projects', requireAuth, route(async (req, res) => {
  const items = await listEntities('projects', { paginate: false, filter: (project) => project.ownerId === req.user.uid });
  res.json(applyPagination(items, req.query.page, req.query.limit));
}));

router.get('/profile/posts', requireAuth, route(async (req, res) => {
  const [legacy, feed] = await Promise.all([
    listEntities('posts', { paginate: false, filter: (post) => post.userId === req.user.uid }),
    listEntities('feed', { paginate: false, filter: (post) => post.userId === req.user.uid }),
  ]);
  const items = [...legacy, ...feed.map((post) => ({ id: post.id, content: post.caption, date: post.date, likes: post.likes, comments: post.comments }))]
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  res.json(applyPagination(items, req.query.page, req.query.limit));
}));

module.exports = router;
