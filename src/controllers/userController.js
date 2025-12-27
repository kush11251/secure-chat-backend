const User = require('../models/User');
const { emitToUsers } = require('../config/websocket');

exports.me = async (req, res) => {
  const user = await User.findById(req.user.id).select('_id uid name email avatarUrl status lastSeen pinnedChats');
  res.json({ user });
};

exports.removeContactByUID = async (req, res) => {
  const { uid } = req.params;
  if (!uid) return res.status(400).json({ message: 'uid is required' });
  const me = await User.findById(req.user.id);
  const other = await User.findOne({ uid: String(uid).toUpperCase() });
  if (!other) return res.status(404).json({ message: 'User not found' });
  await User.findByIdAndUpdate(me._id, { $pull: { contacts: other._id } });
  await User.findByIdAndUpdate(other._id, { $pull: { contacts: me._id } });
  try {
    emitToUsers([me._id, other._id], 'contact:removed', { by: String(me._id), other: String(other._id) });
  } catch {}
  const refreshed = await User.findById(me._id).populate({ path: 'contacts', select: '_id uid name avatarUrl status lastSeen' });
  res.json({ contacts: refreshed.contacts || [] });
};

exports.searchByUID = async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ message: 'uid is required' });
  const user = await User.findOne({ uid: String(uid).toUpperCase() }).select('_id uid name avatarUrl status lastSeen');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
};

exports.addContactByUID = async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ message: 'uid is required' });
  const me = await User.findById(req.user.id);
  const other = await User.findOne({ uid: String(uid).toUpperCase() });
  if (!other) return res.status(404).json({ message: 'User not found' });
  if (other._id.equals(me._id)) return res.status(400).json({ message: 'Cannot add yourself' });
  const updatedMe = await User.findByIdAndUpdate(me._id, { $addToSet: { contacts: other._id } }, { new: true }).select('contacts');
  await User.findByIdAndUpdate(other._id, { $addToSet: { contacts: me._id } });
  try {
    emitToUsers([me._id, other._id], 'contact:added', { by: String(me._id), other: String(other._id) });
  } catch {}
  res.json({ contacts: updatedMe.contacts });
};

exports.listContacts = async (req, res) => {
  const me = await User.findById(req.user.id).populate({ path: 'contacts', select: '_id uid name avatarUrl status lastSeen' });
  res.json({ contacts: me.contacts || [] });
};

exports.updateNotificationsToken = async (req, res) => {
  const { token } = req.body;
  await User.findByIdAndUpdate(req.user.id, { notificationsToken: token });
  res.json({ message: 'Notification token updated' });
};

exports.activeContacts = async (req, res) => {
  const me = await User.findById(req.user.id).populate({ path: 'contacts', select: '_id uid name avatarUrl status lastSeen' });
  const list = (me.contacts || []).map(c => ({ id: c._id, uid: c.uid, name: c.name, avatarUrl: c.avatarUrl, status: c.status, lastSeen: c.lastSeen }));
  res.json({ contacts: list });
};

exports.updateProfile = async (req, res) => {
  const { name, avatarUrl, notificationsToken } = req.body || {};
  const update = {};
  if (name) update.name = name;
  if (typeof avatarUrl === 'string') update.avatarUrl = avatarUrl;
  if (notificationsToken) update.notificationsToken = notificationsToken;
  if (Object.keys(update).length === 0) return res.status(400).json({ message: 'No fields to update' });
  const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('_id uid name email avatarUrl status lastSeen');
  res.json({ user });
};
