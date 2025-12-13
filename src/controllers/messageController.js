const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { getIO, emitToUsers } = require('../config/websocket');
const { notifyUsers } = require('../utils/notifications');

exports.sendMessage = async (req, res) => {
  try {
    const { chatId, type = 'text', content, mediaUrl } = req.body;
    const userId = req.user.id;
    if (!chatId) return res.status(400).json({ message: 'chatId required' });
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.members.map(String).includes(userId)) return res.status(403).json({ message: 'Not a member' });
    const msg = await Message.create({ chatId, sender: userId, type, content, mediaUrl, readBy: [userId] });
    await Chat.findByIdAndUpdate(chatId, { lastMessage: msg._id, updatedAt: new Date() });
    const populated = await Message.findById(msg._id).populate('sender', '_id uid name');
    getIO().to(String(chatId)).emit('message:receive', { chatId, message: populated });
    const otherMembers = chat.members.filter(m => String(m) !== String(userId));
    emitToUsers(otherMembers, 'message:receive', { chatId, message: populated });
    const title = chat.isGroup ? (chat.groupName || 'New group message') : 'New message';
    const body = populated.type === 'text' ? 'New text message' : `New ${populated.type}`;
    notifyUsers(otherMembers, title, body, { chatId: String(chatId) });
    res.status(201).json({ message: populated });
  } catch (err) {
    console.error('sendMessage error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMessages = async (req, res) => {
  const { chatId } = req.params;
  const { limit = 50, before } = req.query;
  const userId = req.user.id;
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.members.map(String).includes(userId)) return res.status(403).json({ message: 'Not a member' });
  const filter = { chatId };
  if (before) filter.createdAt = { $lt: new Date(before) };
  const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(Math.min(Number(limit), 100)).populate('sender', '_id uid name');
  res.json({ messages: messages.reverse() });
};

exports.addReaction = async (req, res) => {
  const { messageId } = req.params; const { emoji } = req.body; const userId = req.user.id;
  const msg = await Message.findById(messageId);
  if (!msg) return res.status(404).json({ message: 'Message not found' });
  const existing = msg.reactions.find(r => String(r.user) === userId);
  if (existing) existing.emoji = emoji; else msg.reactions.push({ user: userId, emoji });
  await msg.save();
  getIO().to(String(msg.chatId)).emit('reaction:update', { messageId, userId, emoji });
  res.json({ message: 'Reaction updated' });
};

exports.removeReaction = async (req, res) => {
  const { messageId } = req.params; const userId = req.user.id;
  const msg = await Message.findById(messageId);
  if (!msg) return res.status(404).json({ message: 'Message not found' });
  msg.reactions = msg.reactions.filter(r => String(r.user) !== userId);
  await msg.save();
  getIO().to(String(msg.chatId)).emit('reaction:update', { messageId, userId, emoji: null });
  res.json({ message: 'Reaction removed' });
};

exports.markRead = async (req, res) => {
  const { chatId } = req.params; const userId = req.user.id;
  const result = await Message.updateMany({ chatId, readBy: { $ne: userId } }, { $addToSet: { readBy: userId } });
  getIO().to(String(chatId)).emit('message:read', { chatId, userId });
  res.json({ updated: result.modifiedCount || 0 });
};
