const { Router } = require('express');
const { query } = require('../db/pool');
const { requireAuth } = require('../middleware/validate');
const { getOwnProfile, updateOwnProfile, publicProfile } = require('../services/identity');

const router = Router();
const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

router.get('/users/me', requireAuth, route(async (req, res) => {
  res.json(await getOwnProfile(req.user));
}));

router.patch('/users/me', requireAuth, route(async (req, res) => {
  const result = await updateOwnProfile(req.user, req.body);
  if (result.error) return res.status(result.status || 400).json({ message: result.error });
  res.json(result);
}));

router.get('/users/:id', route(async (req, res) => {
  const result = await query('SELECT p.*, u.roles FROM profiles p JOIN users u ON u.id = p.id WHERE p.id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ message: 'User not found' });
  res.json(publicProfile(result.rows[0]));
}));

module.exports = router;
