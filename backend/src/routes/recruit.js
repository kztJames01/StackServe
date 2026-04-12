const { Router } = require('express');
const { recruitListings } = require('../seed');

const router = Router();

// GET /api/recruit
router.get('/recruit', (req, res) => {
  const { tag, page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  let result = tag
    ? recruitListings.filter((r) => r.tags && r.tags.includes(tag))
    : recruitListings;

  res.json(result.slice((p - 1) * l, (p - 1) * l + l));
});

// POST /api/recruit
router.post('/recruit', (req, res) => {
  const userId = (req.user && req.user.id) || 'current-user';
  const { role, description } = req.body || {};

  if (!role) return res.status(400).json({ message: 'role is required' });
  if (!description) return res.status(400).json({ message: 'description is required' });

  const listing = {
    id: `recruit-${Date.now()}`,
    ownerId: userId,
    role,
    description,
    tags: req.body.tags || [],
    createdAt: new Date().toISOString(),
  };

  recruitListings.unshift(listing);
  return res.status(201).json({ data: listing, message: 'Listing created' });
});

// PATCH /api/recruit/:id
router.patch('/recruit/:id', (req, res) => {
  const listing = recruitListings.find((r) => r.id === req.params.id);
  if (!listing) return res.status(404).json({ message: 'Listing not found' });

  const allowed = ['role', 'description', 'tags'];
  (req.body ? Object.keys(req.body) : []).forEach((key) => {
    if (allowed.includes(key)) listing[key] = req.body[key];
  });

  return res.json({ data: listing, message: 'Listing updated' });
});

// DELETE /api/recruit/:id
router.delete('/recruit/:id', (req, res) => {
  const index = recruitListings.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Listing not found' });

  recruitListings.splice(index, 1);
  return res.json({ message: 'Listing deleted' });
});

module.exports = router;
