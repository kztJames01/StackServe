const { Router } = require('express');
const {
  getEntityById,
  listEntities,
  upsertEntity,
} = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { getUserId, getUserIdOr401 } = require('../middleware/authUser');

const router = Router();

router.get('/profile', async (_req, res) => {
  const profile = await getEntityById('profile', 'profile-current');
  res.json(profile);
});

router.patch('/profile', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const profile = await getEntityById('profile', 'profile-current');
  if (!profile) {
    return res.status(404).json({ message: 'Profile not found' });
  }

  const allowed = ['name', 'bio', 'avatar', 'skills', 'socials'];
  const updates = req.body || {};

  allowed.forEach((key) => {
    if (updates[key] !== undefined) {
      profile[key] = updates[key];
    }
  });

  await upsertEntity('profile', profile);

  const user = await getEntityById('users', userId);
  if (user) {
    await upsertEntity('users', { ...user, ...updates, id: userId, userId });
  }

  return res.json({ data: profile, message: 'Profile updated' });
});

router.get('/profile/projects', async (req, res) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  const { page = 1, limit = 10 } = req.query;
  const userProjects = await listEntities('projects', {
    paginate: false,
    filter: (proj) => !proj.ownerId || proj.ownerId === userId,
  });
  const p = Math.max(1, parseInt(page, 10));
  const l = Math.min(100, Math.max(1, parseInt(limit, 10)));
  res.json(userProjects.slice((p - 1) * l, (p - 1) * l + l));
});

router.get('/profile/posts', async (req, res) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  const { page = 1, limit = 10 } = req.query;
  const userPosts = await listEntities('posts', {
    paginate: false,
    filter: (post) => !post.userId || post.userId === userId,
  });
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  res.json(userPosts.slice((p - 1) * l, (p - 1) * l + l));
});

module.exports = router;
