const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { uploadToCloudinary } = require('../utils/cloudinaryUploader');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { getIO, emitToUsers } = require('../config/websocket');
const { notifyUsers } = require('../utils/notifications');

exports.uploadMiddleware = upload.single('file');

exports.uploadAndSend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId, type = 'file' } = req.body;
    if (!req.file) return res.status(400).json({ message: 'File required' });
    if (!chatId) return res.status(400).json({ message: 'chatId required' });
    const allowed = new Set([
      'image/',
      'video/',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ]);
    const okType = [...allowed].some(prefix => req.file.mimetype.startsWith(prefix) || req.file.mimetype === prefix);
    if (!okType) return res.status(400).json({ message: 'Unsupported file type' });
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.members.map(String).includes(userId)) return res.status(403).json({ message: 'Not a member' });
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const uploaded = await uploadToCloudinary(dataUri);
    const msg = await Message.create({ chatId, sender: userId, type, mediaUrl: uploaded.url, readBy: [userId] });
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
    console.error('media upload error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.storeMediaMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId, type = 'file', mediaUrl } = req.body;
    if (!chatId || !mediaUrl) return res.status(400).json({ message: 'chatId and mediaUrl required' });
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.members.map(String).includes(userId)) return res.status(403).json({ message: 'Not a member' });
    const msg = await Message.create({ chatId, sender: userId, type, mediaUrl, readBy: [userId] });
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
    console.error('store media error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
