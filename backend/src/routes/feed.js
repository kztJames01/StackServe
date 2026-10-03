const { Router } = require('express');
const { randomUUID } = require('crypto');
const { deleteEntity, getEntityById, listEntities, upsertEntity } = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { getOwnProfile } = require('../services/identity');

const router = Router();
const route = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

async function canAccessStudents(req) {
  if (!req.user?.verifiedToken) return false;
  const profile = await getOwnProfile(req.user);
  return profile.studentStatus === 'verified';
}

router.get('/feed', route(async (req, res) => {
  const students = req.query.audience === 'students';
  if (students && !(await canAccessStudents(req))) return res.status(403).json({ message: 'Student Maker verification is required for student discovery.' });
  const result = await listEntities('feed', { page: req.query.page, limit: req.query.limit,
    filter: (post) => students ? post.audience === 'students' : post.audience !== 'students' });
  res.json(result);
}));

router.post('/posts', requireAuth, route(async (req, res) => {
  const { caption, content, description = '', audience = 'public' } = req.body || {};
  const text = caption || content;
  if (typeof text !== 'string' || !text.trim() || text.length > 5000 || typeof description !== 'string' || description.length > 10000 || !['public', 'students'].includes(audience)) {
    return res.status(400).json({ message: 'Provide a post of 1–5000 characters and a valid audience.' });
  }
  if (audience === 'students' && !(await canAccessStudents(req))) return res.status(403).json({ message: 'Student Maker verification is required.' });
  const profile = await getOwnProfile(req.user);
  const post = {
    id: randomUUID(), userId: req.user.uid,
    user: { id: req.user.uid, name: profile.name, avatar: profile.avatar, rating: '' },
    date: new Date().toISOString(), caption: text.trim(), description, audience, likes: 0, comments: 0, shares: 0,
  };
  await upsertEntity('feed', post);
  res.status(201).json({ data: post, message: 'Post created' });
}));

router.post('/posts/:id/like', requireAuth, route(async (req, res) => {
  const post = await getEntityById('feed', req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (post.audience === 'students' && !(await canAccessStudents(req))) return res.status(403).json({ message: 'Student Maker verification is required.' });
  post.likes = (post.likes || 0) + 1;
  await upsertEntity('feed', post);
  res.json({ likes: post.likes, data: post, message: 'Post liked' });
}));

router.delete('/posts/:id', requireAuth, route(async (req, res) => {
  const post = await getEntityById('feed', req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (post.userId !== req.user.uid) return res.status(403).json({ message: 'Only the author can delete this post.' });
  await deleteEntity('feed', req.params.id);
  res.json({ message: 'Post deleted' });
}));

module.exports = router;
