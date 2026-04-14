const { Router } = require('express');
const {
  deleteEntity,
  getEntityById,
  getEntityBySlug,
  listEntities,
  upsertEntity,
} = require('../db/repository');

const router = Router();

function paginate(array, page, limit) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 10));
  return array.slice((p - 1) * l, (p - 1) * l + l);
}

// GET /api/projects
router.get('/projects', async (req, res) => {
  const { tag, page, limit } = req.query;
  let result = await listEntities('projects', { paginate: false });
  if (tag) {
    result = result.filter((proj) => proj.tags && proj.tags.includes(tag));
  }
  res.json(paginate(result, page, limit));
});

// POST /api/projects
router.post('/projects', async (req, res) => {
  const userId = (req.user && (req.user.id || req.user.uid)) || 'current-user';
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

// GET /api/projects/:slug
router.get('/projects/:slug', async (req, res) => {
  const project = (await getEntityById('projects', req.params.slug)) || (await getEntityBySlug('projects', req.params.slug));
  if (!project) return res.status(404).json({ message: 'Project not found' });
  res.json(project);
});

// PATCH /api/projects/:id
router.patch('/projects/:id', async (req, res) => {
  const project = await getEntityById('projects', req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const allowed = ['title', 'description', 'image', 'tags', 'status', 'collaborators'];
  (req.body ? Object.keys(req.body) : []).forEach((key) => {
    if (allowed.includes(key)) project[key] = req.body[key];
  });

  await upsertEntity('projects', project);

  return res.json({ data: project, message: 'Project updated' });
});

// DELETE /api/projects/:id
router.delete('/projects/:id', async (req, res) => {
  const deleted = await deleteEntity('projects', req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Project not found' });

  return res.json({ message: 'Project deleted' });
});

module.exports = router;
