const { Router } = require('express');
const {
  getEntityById,
  listEntities,
  upsertEntity,
} = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { getUserId, getUserIdOr401 } = require('../middleware/authUser');

const router = Router();

router.get('/notifications', async (req, res) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  const { page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  const userNotifs = await listEntities('notifications', {
    paginate: false,
    filter: (notification) => notification.userId === userId,
  });
  res.json(userNotifs.slice((p - 1) * l, (p - 1) * l + l));
});

router.patch('/notifications/read-all', requireAuth, async (req, res) => {
  const userId = getUserId(req);

  const notifications = await listEntities('notifications', {
    paginate: false,
    filter: (notification) => notification.userId === userId,
  });
  await Promise.all(notifications.map((notification) => upsertEntity('notifications', { ...notification, read: true })));

  return res.json({ message: 'All notifications marked as read' });
});

router.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  const notif = await getEntityById('notifications', req.params.id);
  if (!notif) return res.status(404).json({ message: 'Notification not found' });

  notif.read = true;
  await upsertEntity('notifications', notif);
  return res.json({ data: notif, message: 'Notification marked as read' });
});

module.exports = router;
