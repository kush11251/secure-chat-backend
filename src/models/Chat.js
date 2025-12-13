const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  isGroup: { type: Boolean, default: false },
  groupName: { type: String },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
}, { timestamps: true });

ChatSchema.index({ isGroup: 1 });
ChatSchema.index({ members: 1 });

module.exports = mongoose.model('Chat', ChatSchema);
