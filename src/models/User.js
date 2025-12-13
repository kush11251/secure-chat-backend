const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  uid: { type: String, unique: true, index: true, required: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, index: true, required: true },
  password: { type: String, required: true },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pinnedChats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }],
  notificationsToken: { type: String },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
