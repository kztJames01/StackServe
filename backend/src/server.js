require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { feed, posts, profile, projects, tasks } = require('./seed');

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'makerspace-api' });
});

app.get('/api/feed', (_req, res) => {
  res.json(feed);
});

app.get('/api/profile', (_req, res) => {
  res.json(profile);
});

app.get('/api/profile/projects', (_req, res) => {
  res.json(projects);
});

app.get('/api/profile/posts', (_req, res) => {
  res.json(posts);
});

app.get('/api/tasks', (req, res) => {
  const teamId = String(req.query.teamId || 'default-team');
  res.json(tasks.filter((task) => task.teamId === teamId));
});

app.post('/api/tasks', (req, res) => {
  const payload = req.body || {};
  const newTask = {
    id: `task-${Date.now()}`,
    title: payload.title || 'Untitled task',
    description: payload.description || '',
    status: payload.status || 'todo',
    priority: payload.priority || 'medium',
    assignedTo: payload.assignedTo || 'current-user',
    teamId: payload.teamId || 'default-team',
    createdAt: new Date().toISOString(),
  };

  tasks.unshift(newTask);
  res.status(201).json(newTask);
});

app.patch('/api/tasks/:id', (req, res) => {
  const task = tasks.find((item) => item.id === req.params.id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  if (req.body.status) {
    task.status = req.body.status;
  }

  return res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const index = tasks.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Task not found' });
  }

  tasks.splice(index, 1);
  return res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`makerspace-api running on http://localhost:${port}`);
});
