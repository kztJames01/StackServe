const { Router } = require('express');
const { profile } = require('../seed');

const router = Router();

// In-memory user store (extends the seed profile as the current user)
const users = [
  { id: 'current-user', ...profile },
  { id: 'user-2', name: 'Alex builder', bio: 'Full-stack dev', avatar: '/home.jpg', skills: ['Vue', 'Go'] },
];

// GET /api/users/me
router.get('/users/me', (req, res) => {
  const userId = (req.user && req.user.id) || 'current-user';
  const user = users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// PATCH /api/users/me
router.patch('/users/me', (req, res) => {
  const userId = (req.user && req.user.id) || 'current-user';
  const user = users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const allowed = ['name', 'bio', 'avatar', 'skills', 'socials'];
  (req.body ? Object.keys(req.body) : []).forEach((key) => {
    if (allowed.includes(key)) user[key] = req.body[key];
  });

  return res.json({ data: user, message: 'User updated' });
});

// GET /api/users/:id
router.get('/users/:id', (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

module.exports = router;
