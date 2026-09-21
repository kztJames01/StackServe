const { Router } = require('express');
const {
  deleteEntity,
  getEntityById,
  listEntities,
  upsertEntity,
} = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { getUserId } = require('../middleware/authUser');

const router = Router();

router.get('/recruit', async (req, res) => {
  const { tag, page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  let result = await listEntities('recruit', { paginate: false });
  if (tag) {
    result = result.filter((listing) => (listing.tags || listing.skills || []).includes(tag));
  }

  res.json(result.slice((p - 1) * l, (p - 1) * l + l));
});

router.post('/recruit', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { role, title, description } = req.body || {};
  const listingTitle = title || role;

  if (!listingTitle) return res.status(400).json({ message: 'role is required' });
  if (!description) return res.status(400).json({ message: 'description is required' });

  const listing = {
    id: `recruit-${Date.now()}`,
    title: listingTitle,
    projectId: req.body.projectId || null,
    projectName: req.body.projectName || '',
    skills: req.body.skills || req.body.tags || [],
    commitment: req.body.commitment || '',
    equity: req.body.equity || '',
    description,
    postedBy: userId,
    createdAt: new Date().toISOString(),
  };

  await upsertEntity('recruit', listing);
  return res.status(201).json({ data: listing, message: 'Listing created' });
});

router.patch('/recruit/:id', requireAuth, async (req, res) => {
  const listing = await getEntityById('recruit', req.params.id);
  if (!listing) return res.status(404).json({ message: 'Listing not found' });

  const allowed = ['title', 'description', 'skills', 'commitment', 'equity', 'projectName'];
  (req.body ? Object.keys(req.body) : []).forEach((key) => {
    if (allowed.includes(key)) listing[key] = req.body[key];
  });

  await upsertEntity('recruit', listing);

  return res.json({ data: listing, message: 'Listing updated' });
});

router.delete('/recruit/:id', requireAuth, async (req, res) => {
  const deleted = await deleteEntity('recruit', req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Listing not found' });

  return res.json({ message: 'Listing deleted' });
});

module.exports = router;
