const { Router } = require('express');
const { projects } = require('../seed');

const router = Router();

function paginate(array, page, limit) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 10));
  return array.slice((p - 1) * l, (p - 1) * l + l);
}

// GET /api/projects
router.get('/projects', (req, res) => {
  const { tag, page, limit } = req.query;
  let result = tag
    ? projects.filter((proj) => proj.tags && proj.tags.includes(tag))
    : projects;
  res.json(paginate(result, page, limit));
});

// POST /api/projects
router.post('/projects', (req, res) => {
  const userId = (req.user && req.user.id) || 'current-user';
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
    createdAt: new Date().toISOString(),
  };

  projects.unshift(project);
  return res.status(201).json({ data: project, message: 'Project created' });
});

// GET /api/projects/:slug
router.get('/projects/:slug', (req, res) => {
  const project = projects.find(
    (p) => String(p.id) === req.params.slug || p.slug === req.params.slug
  );
  if (!project) return res.status(404).json({ message: 'Project not found' });
  res.json(project);
});

// PATCH /api/projects/:id
router.patch('/projects/:id', (req, res) => {
  const project = projects.find((p) => String(p.id) === req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const allowed = ['title', 'description', 'image', 'tags'];
  (req.body ? Object.keys(req.body) : []).forEach((key) => {
    if (allowed.includes(key)) project[key] = req.body[key];
  });

  return res.json({ data: project, message: 'Project updated' });
});

// DELETE /api/projects/:id
router.delete('/projects/:id', (req, res) => {
  const index = projects.findIndex((p) => String(p.id) === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Project not found' });

  projects.splice(index, 1);
  return res.json({ message: 'Project deleted' });
});

module.exports = router;
