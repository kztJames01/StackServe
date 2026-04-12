const { Router } = require('express');
const { notifications } = require('../seed');

const router = Router();

// GET /api/notifications
router.get('/notifications', (req, res) => {
  const userId = (req.user && req.user.id) || 'current-user';
  const { page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  const userNotifs = notifications.filter((n) => n.userId === userId);
  res.json(userNotifs.slice((p - 1) * l, (p - 1) * l + l));
});

// PATCH /api/notifications/read-all
router.patch('/notifications/read-all', (req, res) => {
  const userId = (req.user && req.user.id) || 'current-user';

  notifications
    .filter((n) => n.userId === userId)
    .forEach((n) => { n.read = true; });

  return res.json({ message: 'All notifications marked as read' });
});

// PATCH /api/notifications/:id/read
router.patch('/notifications/:id/read', (req, res) => {
  const notif = notifications.find((n) => n.id === req.params.id);
  if (!notif) return res.status(404).json({ message: 'Notification not found' });

  notif.read = true;
  return res.json({ data: notif, message: 'Notification marked as read' });
});

module.exports = router;
