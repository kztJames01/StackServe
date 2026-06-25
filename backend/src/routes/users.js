const { Router } = require('express');
const {
  getEntityById,
  upsertEntity,
} = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { getUserId } = require('../middleware/authUser');

const router = Router();

router.get('/users/me', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const user = await getEntityById('users', userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

router.patch('/users/me', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  let user = await getEntityById('users', userId);

  if (!user) {
    user = { id: userId, userId, name: req.user.email || userId };
  }

  const allowed = ['name', 'bio', 'avatar', 'skills', 'socials'];
  (req.body ? Object.keys(req.body) : []).forEach((key) => {
    if (allowed.includes(key)) user[key] = req.body[key];
  });

  await upsertEntity('users', user);

  return res.json({ data: user, message: 'User updated' });
});

router.get('/users/:id', async (req, res) => {
  const user = await getEntityById('users', req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

module.exports = router;
