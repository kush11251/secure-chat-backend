const Chat = require('../models/Chat');
const User = require('../models/User');
const { emitToUsers } = require('../config/websocket');

exports.listChats = async (req, res) => {
  const userId = req.user.id;
  const chats = await Chat.find({ members: userId }).sort({ updatedAt: -1 }).populate('members', '_id uid name status').populate('lastMessage');
  // compute unreadCount per chat (messages not read by this user)
  const Message = require('../models/Message');
  const chatsWithCounts = await Promise.all(chats.map(async (c) => {
    const unread = await Message.countDocuments({ chatId: c._id, readBy: { $ne: userId } });
    return Object.assign(c.toObject(), { unreadCount: unread });
  }));
  res.json({ chats: chatsWithCounts });
};

exports.getOrCreateDirect = async (req, res) => {
  const userId = req.user.id;
  const { userId: otherId } = req.body;
  if (!otherId) return res.status(400).json({ message: 'userId is required' });
  if (otherId === userId) return res.status(400).json({ message: 'Cannot chat with yourself' });
  let chat = await Chat.findOne({ isGroup: false, members: { $all: [userId, otherId], $size: 2 } }).populate('members', '_id uid name status').populate('lastMessage');
  if (!chat) {
    chat = await Chat.create({ isGroup: false, members: [userId, otherId] });
    chat = await Chat.findById(chat._id).populate('members', '_id uid name status');
  }
  res.status(201).json({ chat });
};

exports.createGroup = async (req, res) => {
  const userId = req.user.id;
  const { groupName, memberIds } = req.body;
  if (!groupName || !Array.isArray(memberIds) || memberIds.length === 0) return res.status(400).json({ message: 'groupName and memberIds required' });
  const members = Array.from(new Set([userId, ...memberIds]));
  let chat = await Chat.create({ isGroup: true, groupName, members, admins: [userId] });
  chat = await Chat.findById(chat._id).populate('members', '_id uid name status');
  emitToUsers(members, 'group:update', { chatId: chat._id, action: 'created' });
  res.status(201).json({ chat });
};

exports.updateGroup = async (req, res) => {
  const userId = req.user.id;
  const { chatId } = req.params;
  const { groupName } = req.body;
  let chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroup) return res.status(404).json({ message: 'Group not found' });
  if (!chat.admins.map(String).includes(userId)) return res.status(403).json({ message: 'Admins only' });
  if (groupName) chat.groupName = groupName;
  await chat.save();
  emitToUsers(chat.members, 'group:update', { chatId, action: 'updated' });
  res.json({ chat: await Chat.findById(chatId).populate('members', '_id uid name status') });
};

exports.addMembers = async (req, res) => {
  const userId = req.user.id;
  const { chatId } = req.params;
  const { memberIds } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroup) return res.status(404).json({ message: 'Group not found' });
  if (!chat.admins.map(String).includes(userId)) return res.status(403).json({ message: 'Admins only' });
  chat.members = Array.from(new Set([...chat.members.map(String), ...memberIds]));
  await chat.save();
  emitToUsers(chat.members, 'group:update', { chatId, action: 'members_added' });
  res.json({ chat: await Chat.findById(chatId).populate('members', '_id uid name status') });
};

exports.removeMember = async (req, res) => {
  const userId = req.user.id;
  const { chatId, memberId } = req.params;
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isGroup) return res.status(404).json({ message: 'Group not found' });
  if (!chat.admins.map(String).includes(userId)) return res.status(403).json({ message: 'Admins only' });
  chat.members = chat.members.filter(m => String(m) !== String(memberId));
  chat.admins = chat.admins.filter(m => String(m) !== String(memberId));
  await chat.save();
  emitToUsers(chat.members, 'group:update', { chatId, action: 'member_removed', memberId });
  res.json({ chat: await Chat.findById(chatId).populate('members', '_id uid name status') });
};

exports.pinChat = async (req, res) => {
  const userId = req.user.id; const { chatId } = req.params;
  await User.findByIdAndUpdate(userId, { $addToSet: { pinnedChats: chatId } });
  res.json({ message: 'Pinned' });
};

exports.unpinChat = async (req, res) => {
  const userId = req.user.id; const { chatId } = req.params;
  await User.findByIdAndUpdate(userId, { $pull: { pinnedChats: chatId } });
  res.json({ message: 'Unpinned' });
};
