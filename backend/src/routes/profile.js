const { Router } = require('express');
const { profile, projects, posts } = require('../seed');

const router = Router();

// GET /api/profile
router.get('/profile', (req, res) => {
  res.json(profile);
});

// PATCH /api/profile
router.patch('/profile', (req, res) => {
  const allowed = ['name', 'bio', 'avatar', 'skills', 'socials'];
  const updates = req.body || {};

  allowed.forEach((key) => {
    if (updates[key] !== undefined) {
      profile[key] = updates[key];
    }
  });

  return res.json({ data: profile, message: 'Profile updated' });
});

// GET /api/profile/projects
router.get('/profile/projects', (req, res) => {
  const userId = (req.user && req.user.id) || 'current-user';
  const { page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  const userProjects = projects.filter((proj) =>
    !proj.ownerId || proj.ownerId === userId
  );
  res.json(userProjects.slice((p - 1) * l, (p - 1) * l + l));
});

// GET /api/profile/posts
router.get('/profile/posts', (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  res.json(posts.slice((p - 1) * l, (p - 1) * l + l));
});

module.exports = router;
