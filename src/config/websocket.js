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
