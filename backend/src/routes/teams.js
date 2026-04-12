const { Router } = require('express');
const { teams } = require('../seed');

const router = Router();

// GET /api/teams
router.get('/teams', (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  res.json(teams.slice((p - 1) * l, (p - 1) * l + l));
});

// POST /api/teams
router.post('/teams', (req, res) => {
  const userId = (req.user && req.user.id) || 'current-user';
  const { name, description } = req.body || {};

  if (!name) return res.status(400).json({ message: 'name is required' });

  const team = {
    id: `team-${Date.now()}`,
    name,
    description: description || '',
    ownerId: userId,
    members: [{ userId, role: 'owner' }],
    createdAt: new Date().toISOString(),
  };

  teams.unshift(team);
  return res.status(201).json({ data: team, message: 'Team created' });
});

// GET /api/teams/:id
router.get('/teams/:id', (req, res) => {
  const team = teams.find((t) => t.id === req.params.id);
  if (!team) return res.status(404).json({ message: 'Team not found' });
  res.json(team);
});

// PATCH /api/teams/:id
router.patch('/teams/:id', (req, res) => {
  const team = teams.find((t) => t.id === req.params.id);
  if (!team) return res.status(404).json({ message: 'Team not found' });

  const allowed = ['name', 'description'];
  (req.body ? Object.keys(req.body) : []).forEach((key) => {
    if (allowed.includes(key)) team[key] = req.body[key];
  });

  return res.json({ data: team, message: 'Team updated' });
});

// POST /api/teams/:id/members
router.post('/teams/:id/members', (req, res) => {
  const team = teams.find((t) => t.id === req.params.id);
  if (!team) return res.status(404).json({ message: 'Team not found' });

  const { userId, role } = req.body || {};
  if (!userId) return res.status(400).json({ message: 'userId is required' });

  const exists = team.members.some((m) => m.userId === userId);
  if (exists) return res.status(409).json({ message: 'Member already in team' });

  const member = { userId, role: role || 'member' };
  team.members.push(member);
  return res.status(201).json({ data: member, message: 'Member added' });
});

// DELETE /api/teams/:id/members/:memberId
router.delete('/teams/:id/members/:memberId', (req, res) => {
  const team = teams.find((t) => t.id === req.params.id);
  if (!team) return res.status(404).json({ message: 'Team not found' });

  const index = team.members.findIndex((m) => m.userId === req.params.memberId);
  if (index === -1) return res.status(404).json({ message: 'Member not found' });

  team.members.splice(index, 1);
  return res.json({ message: 'Member removed' });
});

module.exports = router;
