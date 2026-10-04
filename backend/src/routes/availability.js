const { Router } = require('express');
const {
  listEntities,
  upsertEntity,
  patchEntity,
  deleteEntity,
  getEntityById,
} = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { getUserId, getUserIdOr401 } = require('../middleware/authUser');

const router = Router();

// list availability rows, optionally per freelancer
router.get('/availability', async (req, res) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  const { freelancerId, page = 1, limit = 100 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  // only the caller's own rows
  let rows = await listEntities('availability', {
    paginate: false,
    filter: (row) => row.userId === userId,
  });
  if (freelancerId) rows = rows.filter((row) => row.freelancerId === freelancerId);
  res.json(rows.slice((p - 1) * l, (p - 1) * l + l));
});

router.post('/availability', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { freelancerId, start, end, status, shootId } = req.body || {};

  if (!freelancerId || !start || !end) {
    return res.status(400).json({ message: 'freelancerId, start and end are required' });
  }

  const row = {
    id: `avail-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId,
    freelancerId,
    start,
    end,
    status: status || 'available',
    shootId: shootId || null,
    date: new Date().toISOString(),
  };

  await upsertEntity('availability', row);
  return res.status(201).json({ data: row, message: 'Availability saved' });
});

router.patch('/availability/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const existing = await getEntityById('availability', req.params.id);
  // 404 so other peoples row ids cant be probed
  if (!existing || existing.userId !== userId) {
    return res.status(404).json({ message: 'Availability not found' });
  }

  const allowed = ['start', 'end', 'status', 'shootId'];
  const updates = {};
  Object.keys(req.body || {}).forEach((key) => {
    if (allowed.includes(key)) updates[key] = req.body[key];
  });

  const row = await patchEntity('availability', req.params.id, updates);
  return res.json({ data: row, message: 'Availability updated' });
});

router.delete('/availability/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const existing = await getEntityById('availability', req.params.id);
  if (!existing || existing.userId !== userId) {
    return res.status(404).json({ message: 'Availability not found' });
  }
  await deleteEntity('availability', req.params.id);
  return res.json({ message: 'Availability deleted' });
});

module.exports = router;
