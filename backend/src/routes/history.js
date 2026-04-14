const { Router } = require('express');
const {
  listEntities,
  upsertEntity,
} = require('../db/repository');

const router = Router();

// GET /api/history
router.get('/history', async (req, res) => {
  const userId = (req.user && (req.user.id || req.user.uid)) || 'current-user';
  const { page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  const userHistory = await listEntities('history', {
    paginate: false,
    filter: (entry) => entry.userId === userId,
  });
  res.json(userHistory.slice((p - 1) * l, (p - 1) * l + l));
});

// POST /api/history
router.post('/history', async (req, res) => {
  const userId = (req.user && (req.user.id || req.user.uid)) || 'current-user';
  const { action, entityId, entityType, title, description, type, projectId, date } = req.body || {};

  if (!title && !action) return res.status(400).json({ message: 'title is required' });

  const entry = {
    id: `hist-${Date.now()}`,
    userId,
    projectId: projectId || entityId || null,
    title: title || action,
    description: description || '',
    type: type || entityType || 'milestone',
    date: date || new Date().toISOString(),
  };

  await upsertEntity('history', entry);
  return res.status(201).json({ data: entry, message: 'History recorded' });
});

module.exports = router;
