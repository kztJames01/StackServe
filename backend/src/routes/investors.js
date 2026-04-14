const { Router } = require('express');
const {
  listEntities,
  upsertEntity,
} = require('../db/repository');

const router = Router();

// GET /api/investors
router.get('/investors', async (req, res) => {
  const { stage, page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  let result = await listEntities('investors', { paginate: false });
  if (stage) {
    result = result.filter((investor) => investor.stage === stage);
  }

  res.json(result.slice((p - 1) * l, (p - 1) * l + l));
});

// POST /api/investors
router.post('/investors', async (req, res) => {
  const { name, focus, focusAreas, stage, website, contactUrl, bio, avatar, portfolio } = req.body || {};

  if (!name) return res.status(400).json({ message: 'name is required' });

  const investor = {
    id: `inv-${Date.now()}`,
    name,
    bio: bio || '',
    avatar: avatar || '/home.jpg',
    focusAreas: focusAreas || focus || [],
    stage: stage || '',
    portfolio: portfolio || [],
    contactUrl: contactUrl || website || '',
  };

  await upsertEntity('investors', investor);
  return res.status(201).json({ data: investor, message: 'Investor added' });
});

module.exports = router;
