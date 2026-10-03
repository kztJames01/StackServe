const { Router } = require('express');
const { query } = require('../db/pool');
const { requireAuth } = require('../middleware/validate');

const router = Router();

router.get('/investors', async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const values = [limit, (page - 1) * limit];
    if (req.query.stage) values.push(String(req.query.stage));
    const result = await query(`SELECT id, name, stage, check_size AS "checkSize", aum_range AS "aumRange", thesis,
      org_domain AS "orgDomain", 'verified' AS status, COALESCE(data->>'bio', '') AS bio,
      COALESCE(data->>'avatar', '') AS avatar, COALESCE(data->'focusAreas', '[]') AS "focusAreas",
      COALESCE(data->'portfolio', '[]') AS portfolio FROM investor_profiles
      WHERE status = 'verified'${req.query.stage ? ' AND stage = $3' : ''}
      ORDER BY reviewed_at DESC LIMIT $1 OFFSET $2`, values);
    res.json(result.rows);
  } catch (error) { next(error); }
});

router.post('/investors', requireAuth, (_req, res) => {
  res.status(400).json({ message: 'Submit investor credentials through account verification. Only staff-reviewed investors are featured.' });
});

module.exports = router;
