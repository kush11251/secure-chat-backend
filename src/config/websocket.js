const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;
const userSockets = new Map();

function addUserSocket(userId, socketId) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socketId);
}

function removeUserSocket(userId, socketId) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(userId);
}

async function setPresence(userId, online) {
  try {
    await User.findByIdAndUpdate(userId, { status: online ? 'online' : 'offline', lastSeen: new Date() });
    const user = await User.findById(userId).select('contacts');
    const contacts = (user?.contacts || []).map(String);
    emitToUsers(contacts, online ? 'user:online' : 'user:offline', { userId });
  } catch (e) {
    console.error('presence error', e.message);
  }
}

function attachIO(httpServer, ioOptions = {}) {
  io = new Server(httpServer, ioOptions);
  io.on('connection', async (socket) => {
    try {
      const headerAuth = socket.handshake.headers?.authorization;
      const tokenFromHeader = headerAuth && headerAuth.startsWith('Bearer ')
        ? headerAuth.slice(7)
        : null;
      const token = socket.handshake.auth?.token || socket.handshake.query?.token || tokenFromHeader;
      if (!token) return socket.disconnect();
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = payload.id;
      addUserSocket(payload.id, socket.id);
      await setPresence(payload.id, true);
    } catch (err) {
      console.error('socket auth failed', err.message);
      return socket.disconnect();
    }

    // basic handshake acknowledge for quick testing
    socket.emit('hello', { userId: socket.userId, ts: Date.now() });

    socket.on('join:chat', (chatId) => { if (chatId) socket.join(String(chatId)); });
    socket.on('leave:chat', (chatId) => { if (chatId) socket.leave(String(chatId)); });
    socket.on('typing:start', ({ chatId }) => { if (chatId) socket.to(String(chatId)).emit('typing:start', { chatId, userId: socket.userId }); });
    socket.on('typing:stop', ({ chatId }) => { if (chatId) socket.to(String(chatId)).emit('typing:stop', { chatId, userId: socket.userId }); });
    socket.on('message:read', ({ chatId, messageIds }) => { if (chatId) socket.to(String(chatId)).emit('message:read', { chatId, userId: socket.userId, messageIds }); });
    socket.on('message:delivered', async ({ messageId, chatId, messageIds }) => {
      try {
        const Message = require('../models/Message');
        const Chat = require('../models/Chat');
        if (messageId) {
          const msg = await Message.findById(messageId);
          if (!msg) return;
          const chat = await Chat.findById(msg.chatId);
          if (!chat || chat.isGroup) return;
          if (String(msg.sender) === String(socket.userId)) return;
          if (msg.status === 'none') {
            msg.status = 'delivered'; await msg.save();
            socket.to(String(msg.chatId)).emit('message:status', { chatId: msg.chatId, messageIds: [msg._id], status: 'delivered', userId: socket.userId });
          }
          return;
        }
        if (chatId) {
          const chat = await Chat.findById(chatId);
          if (!chat || chat.isGroup) return;
          const filter = { chatId, sender: { $ne: socket.userId }, status: { $ne: 'delivered' } };
          if (Array.isArray(messageIds) && messageIds.length) filter._id = { $in: messageIds };
          const toUpdate = await Message.find(filter).select('_id');
          const ids = toUpdate.map(m => m._id);
          if (ids.length) {
            await Message.updateMany({ _id: { $in: ids } }, { $set: { status: 'delivered' } });
            socket.to(String(chatId)).emit('message:status', { chatId, messageIds: ids, status: 'delivered', userId: socket.userId });
          }
        }
      } catch (e) {
        console.error('socket delivered handler error', e.message);
      }
    });

    // simple ping/pong diagnostic
    socket.on('ping:client', () => socket.emit('pong:server', { ts: Date.now() }));

    socket.on('disconnect', async () => {
      removeUserSocket(socket.userId, socket.id);
      if (!userSockets.has(socket.userId)) await setPresence(socket.userId, false);
    });
  });
  return io;
}

function getIO() { if (!io) throw new Error('Socket.IO not initialized'); return io; }

function emitToUsers(userIds, event, payload) {
  if (!io) return;
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  ids.forEach((uid) => {
    const sockets = userSockets.get(String(uid));
    if (!sockets) return;
    sockets.forEach((sid) => io.to(sid).emit(event, payload));
  });
}

module.exports = { attachIO, getIO, emitToUsers };
