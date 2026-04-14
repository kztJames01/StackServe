const { Router } = require('express');
const {
  getEntityById,
  upsertEntity,
} = require('../db/repository');

const router = Router();

// GET /api/users/me
router.get('/users/me', async (req, res) => {
  const userId = (req.user && (req.user.id || req.user.uid)) || 'current-user';
  const user = await getEntityById('users', userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// PATCH /api/users/me
router.patch('/users/me', async (req, res) => {
  const userId = (req.user && (req.user.id || req.user.uid)) || 'current-user';
  const user = await getEntityById('users', userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const allowed = ['name', 'bio', 'avatar', 'skills', 'socials'];
  (req.body ? Object.keys(req.body) : []).forEach((key) => {
    if (allowed.includes(key)) user[key] = req.body[key];
  });

  await upsertEntity('users', user);
  const profile = await getEntityById('profile', 'profile-current');
  if (profile && userId === 'current-user') {
    await upsertEntity('profile', { ...profile, ...user, id: 'profile-current', userId: 'current-user' });
  }

  return res.json({ data: user, message: 'User updated' });
});

// GET /api/users/:id
router.get('/users/:id', async (req, res) => {
  const user = await getEntityById('users', req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

module.exports = router;
