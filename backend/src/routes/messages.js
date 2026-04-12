const { Router } = require('express');
const { messages, conversations } = require('../seed');

const router = Router();

// GET /api/conversations
router.get('/conversations', (req, res) => {
  const userId = (req.user && req.user.id) || 'current-user';
  const { page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  const userConvs = conversations.filter((c) => c.participants.includes(userId));
  res.json(userConvs.slice((p - 1) * l, (p - 1) * l + l));
});

// GET /api/messages?conversationId=
router.get('/messages', (req, res) => {
  const { conversationId, page = 1, limit = 20 } = req.query;
  if (!conversationId) return res.status(400).json({ message: 'conversationId is required' });

  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  const result = messages
    .filter((m) => m.conversationId === conversationId)
    .slice((p - 1) * l, (p - 1) * l + l);

  res.json(result);
});

// POST /api/messages
router.post('/messages', (req, res) => {
  const userId = (req.user && req.user.id) || 'current-user';
  const { conversationId, text } = req.body || {};

  if (!conversationId) return res.status(400).json({ message: 'conversationId is required' });
  if (!text) return res.status(400).json({ message: 'text is required' });

  const message = {
    id: `msg-${Date.now()}`,
    conversationId,
    senderId: userId,
    text,
    createdAt: new Date().toISOString(),
  };

  messages.push(message);

  // Update conversation lastMessage
  const conv = conversations.find((c) => c.id === conversationId);
  if (conv) {
    conv.lastMessage = text;
    conv.updatedAt = message.createdAt;
  }

  return res.status(201).json({ data: message, message: 'Message sent' });
});

module.exports = router;
