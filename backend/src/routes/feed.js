const { Router } = require('express');
const {
  deleteEntity,
  getEntityById,
  listEntities,
  upsertEntity,
} = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { getUserId } = require('../middleware/authUser');

const router = Router();

router.get('/feed', async (req, res) => {
  const { page, limit } = req.query;
  const result = await listEntities('feed', { page, limit });
  res.json(result);
});

router.post('/posts', requireAuth, async (req, res) => {
  const userId = getUserId(req);
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

router.post('/posts/:id/like', requireAuth, async (req, res) => {
  const post = await getEntityById('feed', req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  post.likes = (post.likes || 0) + 1;
  await upsertEntity('feed', post);
  return res.json({ data: post, message: 'Post liked' });
});

router.delete('/posts/:id', requireAuth, async (req, res) => {
  const deleted = await deleteEntity('feed', req.params.id);
  if (!deleted) return res.status(404).json({ message: 'Post not found' });

  return res.json({ message: 'Post deleted' });
});

module.exports = router;
