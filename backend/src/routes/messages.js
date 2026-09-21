const { Router } = require('express');
const {
  listEntities,
} = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { getUserId, getUserIdOr401 } = require('../middleware/authUser');
const { createMessage, listConversationMessages } = require('../messagesService');

const router = Router();

function normalizeParticipantIds(conversation) {
  if (!Array.isArray(conversation?.participants)) return [];
  return conversation.participants
    .map((item) => (typeof item === 'string' ? item : item?.id || item?.userId || null))
    .filter(Boolean);
}

router.get('/conversations', async (req, res) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  const { page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));

  const userConvs = await listEntities('conversations', {
    paginate: false,
    filter: (conversation) => normalizeParticipantIds(conversation).includes(userId),
  });
  res.json(userConvs.slice((p - 1) * l, (p - 1) * l + l));
});

router.get('/messages', async (req, res) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) return;

  const { conversationId, page = 1, limit = 20 } = req.query;
  if (!conversationId) return res.status(400).json({ message: 'conversationId is required' });

  try {
    const result = await listConversationMessages({
      conversationId,
      userId,
      page,
      limit,
    });
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Failed to load messages' });
  }
});

router.post('/messages', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { conversationId, text, content, receiverId } = req.body || {};
  const messageText = text || content;

  if (!conversationId) return res.status(400).json({ message: 'conversationId is required' });
  if (!messageText) return res.status(400).json({ message: 'text is required' });

  try {
    const message = await createMessage({
      conversationId,
      senderId: userId,
      content: messageText,
      receiverId,
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message:new', message);
    }

    return res.status(201).json({ data: message, message: 'Message sent' });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ message: err.message || 'Failed to send message' });
  }
});

module.exports = router;
