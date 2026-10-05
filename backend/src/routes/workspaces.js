const { Router } = require('express');
const { requireAuth } = require('../middleware/validate');
const { getUserId } = require('../middleware/authUser');
const { tenantScope, requireRole } = require('../middleware/tenantScope');
const { ensureIdentity } = require('../services/identity');
const ws = require('../services/workspace');

const router = Router();
const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

// list workspaces for current user
router.get('/v1/workspaces', requireAuth, route(async (req, res) => {
  const userId = getUserId(req);
  const workspaces = await ws.listWorkspaces(userId);
  res.json(workspaces);
}));

// create workspace
router.post('/v1/workspaces', requireAuth, route(async (req, res) => {
  const userId = getUserId(req);
  const { name, description } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ message: 'name is required' });
  await ensureIdentity(req.user);
  const workspace = await ws.createWorkspace(userId, { name: name.trim(), description });
  res.status(201).json({ data: workspace, message: 'Workspace created' });
}));

// get single workspace
router.get('/v1/workspaces/:id', requireAuth, tenantScope('id'), route(async (req, res) => {
  const workspace = await ws.getWorkspace(req.params.id);
  if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
  const members = await ws.listMembers(req.params.id);
  res.json({ ...workspace, members });
}));

// update workspace (admin only)
router.patch('/v1/workspaces/:id', requireAuth, tenantScope('id'), requireRole('admin'), route(async (req, res) => {
  const updated = await ws.updateWorkspace(req.params.id, req.body || {});
  res.json({ data: updated, message: 'Workspace updated' });
}));

// list members
router.get('/v1/workspaces/:id/members', requireAuth, tenantScope('id'), route(async (req, res) => {
  const members = await ws.listMembers(req.params.id);
  res.json(members);
}));

// update member role (admin only)
router.patch('/v1/workspaces/:id/members/:userId/role', requireAuth, tenantScope('id'), requireRole('admin'), route(async (req, res) => {
  const { role } = req.body || {};
  if (!role) return res.status(400).json({ message: 'role is required' });
  const updated = await ws.updateMemberRole(req.params.id, req.params.userId, role);
  res.json({ data: updated, message: 'Role updated' });
}));

// remove member (admin only)
router.delete('/v1/workspaces/:id/members/:userId', requireAuth, tenantScope('id'), requireRole('admin'), route(async (req, res) => {
  const userId = getUserId(req);
  if (req.params.userId === userId) return res.status(400).json({ message: 'Cannot remove yourself' });
  const removed = await ws.removeMember(req.params.id, req.params.userId);
  if (!removed) return res.status(404).json({ message: 'Member not found' });
  res.json({ message: 'Member removed' });
}));

// invite by email (admin or producer)
router.post('/v1/workspaces/:id/invite', requireAuth, tenantScope('id'), requireRole('admin', 'producer'), route(async (req, res) => {
  const userId = getUserId(req);
  const { email, role } = req.body || {};
  if (!email) return res.status(400).json({ message: 'email is required' });
  const invite = await ws.createInvite(req.params.id, userId, { email, role });
  // return token in response so tests/email integration can send it
  res.status(201).json({ data: invite, message: 'Invite created' });
}));

// accept invite
router.post('/v1/workspaces/invites/:token/accept', requireAuth, route(async (req, res) => {
  const userId = getUserId(req);
  const email = req.user?.email || '';
  await ensureIdentity(req.user);
  const invite = await ws.acceptInvite(req.params.token, userId, email);
  res.json({ data: invite, message: 'Invite accepted' });
}));

// roster: list performers in workspace
router.get('/v1/workspaces/:id/roster', requireAuth, tenantScope('id'), route(async (req, res) => {
  const members = await ws.listMembers(req.params.id);
  const roster = members.filter(m => m.role === 'performer' || m.role === 'producer');
  res.json(roster);
}));

// rate cards (public within authenticated session)
router.get('/v1/rate-cards', requireAuth, route(async (_req, res) => {
  const cards = await ws.listRateCards();
  res.json(cards);
}));

module.exports = router;
