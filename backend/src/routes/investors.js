const { Router } = require('express');
const { investors } = require('../seed');

const router = Router();

// GET /api/investors
router.get('/investors', (req, res) => {
  const { stage, page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  let result = stage
    ? investors.filter((inv) => inv.stage === stage)
    : investors;

  res.json(result.slice((p - 1) * l, (p - 1) * l + l));
});

// POST /api/investors
router.post('/investors', (req, res) => {
  const { name, focus, stage, website } = req.body || {};

  if (!name) return res.status(400).json({ message: 'name is required' });

  const investor = {
    id: `inv-${Date.now()}`,
    name,
    focus: focus || [],
    stage: stage || '',
    website: website || '',
  };

  investors.unshift(investor);
  return res.status(201).json({ data: investor, message: 'Investor added' });
});

module.exports = router;
