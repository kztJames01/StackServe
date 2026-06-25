const { Router } = require('express');
const {
  getEntityById,
  listEntities,
  upsertEntity,
} = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { getUserId, getUserIdOr401 } = require('../middleware/authUser');

const router = Router();

router.get('/conversations', async (req, res) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  const { page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  const userConvs = await listEntities('conversations', {
    paginate: false,
    filter: (conversation) => conversation.participants.includes(userId),
  });
  res.json(userConvs.slice((p - 1) * l, (p - 1) * l + l));
});

router.get('/messages', async (req, res) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  const { conversationId, page = 1, limit = 20 } = req.query;
  if (!conversationId) return res.status(400).json({ message: 'conversationId is required' });

  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  const result = (await listEntities('messages', { paginate: false }))
    .filter((m) => m.conversationId === conversationId)
    .slice((p - 1) * l, (p - 1) * l + l);

  res.json(result);
});

router.post('/messages', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { conversationId, text, content, receiverId } = req.body || {};
  const messageText = text || content;

  if (!conversationId) return res.status(400).json({ message: 'conversationId is required' });
  if (!messageText) return res.status(400).json({ message: 'text is required' });

  const message = {
    id: `msg-${Date.now()}`,
    conversationId,
    senderId: userId,
    receiverId: receiverId || null,
    content: messageText,
    text: messageText,
    timestamp: new Date().toISOString(),
    read: false,
  };

  await upsertEntity('messages', message);

  const conv = await getEntityById('conversations', conversationId);
  if (conv) {
    conv.lastMessage = messageText;
    conv.lastMessageTime = message.timestamp;
    conv.unreadCount = (conv.unreadCount || 0) + 1;
    await upsertEntity('conversations', conv);
  }

  return res.status(201).json({ data: message, message: 'Message sent' });
});

module.exports = router;
