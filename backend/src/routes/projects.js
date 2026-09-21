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

const router = Router();

function paginate(array, page, limit) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 10));
  return array.slice((p - 1) * l, (p - 1) * l + l);
}

router.get('/projects', async (req, res) => {
  const { tag, page, limit } = req.query;
  let result = await listEntities('projects', { paginate: false });
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

router.get('/projects/:slug', async (req, res) => {
  const project = (await getEntityById('projects', req.params.slug)) || (await getEntityBySlug('projects', req.params.slug));
  if (!project) return res.status(404).json({ message: 'Project not found' });
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

  return res.json({ data: project, message: 'Project updated' });
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
