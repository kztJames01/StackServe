const { Server } = require('socket.io');
const { verifyAuthToken } = require('../middleware/auth');
const { createMessage, getConversationOr403 } = require('../messagesService');

function getSocketUser(socket) {
  const raw = socket.data?.user;
  if (!raw) return null;
  return {
    id: raw.uid || raw.id || null,
    email: raw.email || null,
    name: raw.name || null,
  };
}

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    const user = await verifyAuthToken(token);

    if (!user && process.env.NODE_ENV === 'production') {
      return next(new Error('Unauthorized'));
    }

    socket.data.user = user || { uid: 'current-user', email: null, name: 'Dev User' };
    return next();
  });

  io.on('connection', (socket) => {
    const user = getSocketUser(socket);
    if (!user?.id) {
      socket.disconnect(true);
      return;
    }

    socket.join(`user:${user.id}`);

    socket.on('join-conversation', async (payload, ack) => {
      try {
        const conversationId = payload?.conversationId;
        if (!conversationId) {
          if (ack) ack({ ok: false, message: 'conversationId is required' });
          return;
        }
        await getConversationOr403(conversationId, user.id);
        socket.join(`conversation:${conversationId}`);
        if (ack) ack({ ok: true });
      } catch (err) {
        if (ack) ack({ ok: false, message: err.message || 'Failed to join conversation' });
      }
    });

    socket.on('message:send', async (payload, ack) => {
      try {
        const conversationId = payload?.conversationId;
        const content = payload?.content?.trim();
        const receiverId = payload?.receiverId || null;

        if (!conversationId || !content) {
          if (ack) ack({ ok: false, message: 'conversationId and content are required' });
          return;
        }

        const message = await createMessage({
          conversationId,
          senderId: user.id,
          content,
          receiverId,
        });

        io.to(`conversation:${conversationId}`).emit('message:new', message);
        if (ack) ack({ ok: true, data: message });
      } catch (err) {
        if (ack) ack({ ok: false, message: err.message || 'Failed to send message' });
      }
    });
  });

  return io;
}

module.exports = { initSocket };
