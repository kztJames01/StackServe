const { getEntityById, listEntities, upsertEntity } = require('./db/repository');

function normalizeConversationParticipants(conversation) {
  if (!conversation || !Array.isArray(conversation.participants)) return [];
  return conversation.participants.map((item) => {
    if (typeof item === 'string') return item;
    return item?.id || item?.userId || null;
  }).filter(Boolean);
}

async function getConversationOr403(conversationId, userId) {
  const conversation = await getEntityById('conversations', conversationId);
  if (!conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }

  const participants = normalizeConversationParticipants(conversation);
  if (!participants.includes(userId)) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  return conversation;
}

function makeMessageId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createMessage({ conversationId, senderId, content, receiverId }) {
  const conversation = await getConversationOr403(conversationId, senderId);
  const participants = normalizeConversationParticipants(conversation);
  const targetReceiver = receiverId || participants.find((id) => id !== senderId) || null;
  const now = new Date().toISOString();

  const message = {
    id: makeMessageId(),
    conversationId,
    senderId,
    receiverId: targetReceiver,
    content,
    text: content,
    createdAt: now,
    timestamp: now,
    read: false,
  };

  await upsertEntity('messages', message);
  conversation.lastMessage = content;
  conversation.lastMessageAt = now;
  conversation.lastMessageTime = now;
  conversation.unreadCount = (conversation.unreadCount || 0) + 1;
  await upsertEntity('conversations', conversation);
  return message;
}

async function listConversationMessages({ conversationId, userId, page = 1, limit = 20 }) {
  await getConversationOr403(conversationId, userId);
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
  const start = (safePage - 1) * safeLimit;

  const messages = (await listEntities('messages', { paginate: false }))
    .filter((item) => item.conversationId === conversationId)
    .sort((a, b) => {
      const aTs = new Date(a.createdAt || a.timestamp || 0).getTime();
      const bTs = new Date(b.createdAt || b.timestamp || 0).getTime();
      return aTs - bTs;
    })
    .map((item) => ({
      ...item,
      createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
    }));

  return messages.slice(start, start + safeLimit);
}

module.exports = {
  createMessage,
  getConversationOr403,
  listConversationMessages,
};
