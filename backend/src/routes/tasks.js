const { Router } = require('express');
const {
  deleteEntity,
  getEntityById,
  listEntities,
  upsertEntity,
} = require('../db/repository');

const router = Router();

// GET /api/tasks?teamId=
router.get('/tasks', async (req, res) => {
  const { teamId, page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  let result = await listEntities('tasks', { paginate: false });
  if (teamId) {
    result = result.filter((task) => task.teamId === teamId);
  }

  res.json(result.slice((p - 1) * l, (p - 1) * l + l));
});

// POST /api/tasks
router.post('/tasks', async (req, res) => {
  const userId = (req.user && (req.user.id || req.user.uid)) || 'current-user';
  const payload = req.body || {};

  if (!payload.title) return res.status(400).json({ message: 'title is required' });

  const task = {
    id: `task-${Date.now()}`,
    title: payload.title,
    description: payload.description || '',
    status: payload.status || 'todo',
    priority: payload.priority || 'medium',
    assignedTo: payload.assignedTo || userId,
    teamId: payload.teamId || 'default-team',
    createdAt: new Date().toISOString(),
  };

  await upsertEntity('tasks', task);
  return res.status(201).json({ data: task, message: 'Task created' });
});

// PATCH /api/tasks/:id
router.patch('/tasks/:id', async (req, res) => {
  const task = await getEntityById('tasks', req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const allowed = ['title', 'description', 'status', 'priority', 'assignedTo'];
  (req.body ? Object.keys(req.body) : []).forEach((key) => {
    if (allowed.includes(key)) task[key] = req.body[key];
  });

  await upsertEntity('tasks', task);

  return res.json({ data: task, message: 'Task updated' });
});

// DELETE /api/tasks/:id
router.delete('/tasks/:id', async (req, res) => {
  const deleted = await deleteEntity('tasks', req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Task not found' });

  return res.json({ message: 'Task deleted' });
});

module.exports = router;
