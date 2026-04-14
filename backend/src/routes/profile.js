const { Router } = require('express');
const {
  getEntityById,
  listEntities,
  upsertEntity,
} = require('../db/repository');

const router = Router();

// GET /api/profile
router.get('/profile', async (_req, res) => {
  const profile = await getEntityById('profile', 'profile-current');
  res.json(profile);
});

// PATCH /api/profile
router.patch('/profile', async (req, res) => {
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
  const currentUser = await getEntityById('users', 'current-user');
  if (currentUser) {
    await upsertEntity('users', { ...currentUser, ...updates, id: 'current-user' });
  }

  return res.json({ data: profile, message: 'Profile updated' });
});

// GET /api/profile/projects
router.get('/profile/projects', async (req, res) => {
  const userId = (req.user && (req.user.id || req.user.uid)) || 'current-user';
  const { page = 1, limit = 10 } = req.query;
  const userProjects = await listEntities('projects', {
    paginate: false,
    filter: (proj) =>
    !proj.ownerId || proj.ownerId === userId
  });
  const p = Math.max(1, parseInt(page, 10));
  const l = Math.min(100, Math.max(1, parseInt(limit, 10)));
  res.json(userProjects.slice((p - 1) * l, (p - 1) * l + l));
});

// GET /api/profile/posts
router.get('/profile/posts', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const userId = (req.user && (req.user.id || req.user.uid)) || 'current-user';
  const userPosts = await listEntities('posts', {
    paginate: false,
    filter: (post) => !post.userId || post.userId === userId,
  });
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  res.json(userPosts.slice((p - 1) * l, (p - 1) * l + l));
});

module.exports = router;
