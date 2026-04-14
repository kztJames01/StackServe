const { Router } = require('express');
const {
  deleteEntity,
  getEntityById,
  listEntities,
  upsertEntity,
} = require('../db/repository');

const router = Router();

// GET /api/feed
router.get('/feed', async (req, res) => {
  const { page, limit } = req.query;
  const result = await listEntities('feed', { page, limit });
  res.json(result);
});

// POST /api/posts
router.post('/posts', async (req, res) => {
  const userId = (req.user && (req.user.id || req.user.uid)) || 'current-user';
  const { caption, description } = req.body || {};

  if (!caption) {
    return res.status(400).json({ message: 'caption is required' });
  }

  const post = {
    id: `post-${Date.now()}`,
    user: { id: userId, name: userId, avatar: '/home.jpg', rating: '5.0' },
    date: new Date().toISOString(),
    caption,
    description: description || '',
    likes: 0,
    comments: 0,
    shares: 0,
  };

  await upsertEntity('feed', post);
  return res.status(201).json({ data: post, message: 'Post created' });
});

// POST /api/posts/:id/like
router.post('/posts/:id/like', async (req, res) => {
  const post = await getEntityById('feed', req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  post.likes = (post.likes || 0) + 1;
  await upsertEntity('feed', post);
  return res.json({ data: post, message: 'Post liked' });
});

// DELETE /api/posts/:id
router.delete('/posts/:id', async (req, res) => {
  const deleted = await deleteEntity('feed', req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Post not found' });

  return res.json({ message: 'Post deleted' });
});

module.exports = router;
