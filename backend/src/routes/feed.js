const { Router } = require('express');
const { feed, posts } = require('../seed');

const router = Router();

function paginate(array, page, limit) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 10));
  const start = (p - 1) * l;
  return { items: array.slice(start, start + l), page: p, limit: l, total: array.length };
}

// GET /api/feed
router.get('/feed', (req, res) => {
  const { page, limit } = req.query;
  const result = paginate(feed, page, limit);
  res.json(result.items);
});

// POST /api/posts
router.post('/posts', (req, res) => {
  const userId = (req.user && req.user.id) || 'current-user';
  const { caption, description } = req.body || {};

  if (!caption) {
    return res.status(400).json({ message: 'caption is required' });
  }

  const post = {
    id: `post-${Date.now()}`,
    user: { name: userId, avatar: '/home.jpg', rating: '5.0' },
    date: 'just now',
    caption,
    description: description || '',
    likes: 0,
    comments: 0,
    shares: 0,
  };

  feed.unshift(post);
  return res.status(201).json({ data: post, message: 'Post created' });
});

// POST /api/posts/:id/like
router.post('/posts/:id/like', (req, res) => {
  const post = feed.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  post.likes = (post.likes || 0) + 1;
  return res.json({ data: post, message: 'Post liked' });
});

// DELETE /api/posts/:id
router.delete('/posts/:id', (req, res) => {
  const index = feed.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Post not found' });

  feed.splice(index, 1);
  return res.json({ message: 'Post deleted' });
});

module.exports = router;
