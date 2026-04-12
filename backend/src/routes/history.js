const { Router } = require('express');
const { history } = require('../seed');

const router = Router();

// GET /api/history
router.get('/history', (req, res) => {
  const userId = (req.user && req.user.id) || 'current-user';
  const { page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  const userHistory = history.filter((h) => h.userId === userId);
  res.json(userHistory.slice((p - 1) * l, (p - 1) * l + l));
});

// POST /api/history
router.post('/history', (req, res) => {
  const userId = (req.user && req.user.id) || 'current-user';
  const { action, entityId, entityType } = req.body || {};

  if (!action) return res.status(400).json({ message: 'action is required' });
  if (!entityId) return res.status(400).json({ message: 'entityId is required' });
  if (!entityType) return res.status(400).json({ message: 'entityType is required' });

  const entry = {
    id: `hist-${Date.now()}`,
    userId,
    action,
    entityId,
    entityType,
    createdAt: new Date().toISOString(),
  };

  history.unshift(entry);
  return res.status(201).json({ data: entry, message: 'History recorded' });
});

module.exports = router;
