const { Router } = require('express');
const {
  deleteEntity,
  getEntityById,
  getEntityBySlug,
  listEntities,
  upsertEntity,
} = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { getUserId } = require('../middleware/authUser');
const { query } = require('../db/pool');
const { tenantScope, requireRole } = require('../middleware/tenantScope');

const router = Router();

function paginate(array, page, limit) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 10));
  return array.slice((p - 1) * l, (p - 1) * l + l);
}

router.get('/v1/workspaces/:workspaceId/shoots', requireAuth, tenantScope('workspaceId'), async (req, res) => {
  const { tag, page, limit } = req.query;
  let result = await listEntities('projects', {
    paginate: false,
    filter: (shoot) => shoot.workspaceId === req.params.workspaceId,
  });
  if (tag) result = result.filter((shoot) => shoot.tags?.includes(tag));
  res.json(paginate(result, page, limit));
});

router.post('/v1/workspaces/:workspaceId/shoots', requireAuth, tenantScope('workspaceId'), requireRole('admin', 'producer'), async (req, res) => {
  const userId = getUserId(req);
  const { title, description } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ message: 'title is required' });
  const id = String(Date.now());
  const shoot = {
    id,
    slug: `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${id}`,
    workspaceId: req.params.workspaceId,
    ownerId: userId,
    title: title.trim(),
    description: description || '',
    image: '/home.jpg',
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    collaborators: [],
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  await upsertEntity('projects', shoot);
  return res.status(201).json({ data: shoot, message: 'Shoot created' });
});

router.get('/v1/workspaces/:workspaceId/shoots/:slug', requireAuth, tenantScope('workspaceId'), async (req, res) => {
  const shoot = (await getEntityById('projects', req.params.slug)) || (await getEntityBySlug('projects', req.params.slug));
  if (!shoot || shoot.workspaceId !== req.params.workspaceId) return res.status(404).json({ message: 'Shoot not found' });
  res.json(shoot);
});

router.patch('/v1/workspaces/:workspaceId/shoots/:id', requireAuth, tenantScope('workspaceId'), requireRole('admin', 'producer'), async (req, res) => {
  const shoot = await getEntityById('projects', req.params.id);
  if (!shoot || shoot.workspaceId !== req.params.workspaceId) return res.status(404).json({ message: 'Shoot not found' });
  const allowed = ['title', 'description', 'image', 'tags', 'status'];
  for (const key of Object.keys(req.body || {})) {
    if (allowed.includes(key)) shoot[key] = req.body[key];
  }
  await upsertEntity('projects', shoot);
  let warning = null;
  if (req.body?.status === 'delivered') {
    const result = await query('SELECT id, status FROM licenses WHERE workspace_id = $1 AND shoot_id = $2', [req.params.workspaceId, String(shoot.id)]);
    const riders = await query('SELECT id, status FROM digital_replica_contracts WHERE workspace_id = $1 AND shoot_id = $2', [req.params.workspaceId, String(shoot.id)]);
    const unsigned = result.rows.filter((license) => license.status !== 'signed');
    const unsignedRiders = riders.rows.filter((rider) => rider.status !== 'SIGNED');
    if (result.rows.length === 0 && riders.rows.length === 0) warning = 'Shoot marked delivered but no performer clearances exist';
    else if (unsignedRiders.length) warning = `Shoot marked delivered but ${unsignedRiders.length} digital replica rider(s) are not signed`;
    else if (unsigned.length) warning = `Shoot marked delivered but ${unsigned.length} clearance record(s) are not signed`;
  }
  res.json({ data: shoot, message: 'Shoot updated', warning });
});

router.delete('/v1/workspaces/:workspaceId/shoots/:id', requireAuth, tenantScope('workspaceId'), requireRole('admin'), async (req, res) => {
  const shoot = await getEntityById('projects', req.params.id);
  if (!shoot || shoot.workspaceId !== req.params.workspaceId) return res.status(404).json({ message: 'Shoot not found' });
  await deleteEntity('projects', req.params.id);
  res.json({ message: 'Shoot deleted' });
});

// legacy project routes are user-scoped for older clients
router.get('/projects', requireAuth, async (req, res) => {
  const { tag, page, limit } = req.query;
  const userId = getUserId(req);
  let result = await listEntities('projects', { paginate: false, filter: (project) => project.ownerId === userId });
  if (tag) {
    result = result.filter((proj) => proj.tags && proj.tags.includes(tag));
  }
  res.json(paginate(result, page, limit));
});

router.post('/projects', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { title, description } = req.body || {};

  if (!title) return res.status(400).json({ message: 'title is required' });

  const project = {
    id: Date.now(),
    slug: title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    ownerId: userId,
    title,
    description: description || '',
    image: '/home.jpg',
    tags: req.body.tags || [],
    collaborators: req.body.collaborators || [],
    status: req.body.status || 'active',
    createdAt: new Date().toISOString(),
  };

  await upsertEntity('projects', project);
  return res.status(201).json({ data: project, message: 'Project created' });
});

router.get('/projects/:slug', requireAuth, async (req, res) => {
  const project = (await getEntityById('projects', req.params.slug)) || (await getEntityBySlug('projects', req.params.slug));
  if (!project || project.ownerId !== getUserId(req)) return res.status(404).json({ message: 'Project not found' });
  res.json(project);
});

router.patch('/projects/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const project = await getEntityById('projects', req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const canEdit = project.ownerId === userId || (Array.isArray(project.collaborators) && project.collaborators.includes(userId));
  if (!canEdit) return res.status(403).json({ message: 'Forbidden' });

  const allowed = ['title', 'description', 'image', 'tags', 'status', 'collaborators'];
  (req.body ? Object.keys(req.body) : []).forEach((key) => {
    if (allowed.includes(key)) project[key] = req.body[key];
  });

  await upsertEntity('projects', project);

  // deliverables gate: soft warn when marking delivered with unsigned licenses
  let warning = null;
  if (req.body?.status === 'delivered') {
    const result = await query('SELECT id, status FROM licenses WHERE shoot_id = $1', [String(project.id)]);
    const unsigned = result.rows.filter((l) => l.status !== 'signed');
    if (result.rows.length === 0) {
      warning = 'Shoot marked delivered but no licenses exist for its assets';
    } else if (unsigned.length > 0) {
      warning = `Shoot marked delivered but ${unsigned.length} asset(s) lack a signed license`;
    }
  }

  return res.json({ data: project, message: 'Project updated', warning });
});

router.delete('/projects/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const project = await getEntityById('projects', req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (project.ownerId !== userId) return res.status(403).json({ message: 'Only owner can delete project' });

  const deleted = await deleteEntity('projects', req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Project not found' });

  return res.json({ message: 'Project deleted' });
});

module.exports = router;
