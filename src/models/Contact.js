const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  createdAt: { type: Date, default: Date.now }
});

ContactSchema.index({ user: 1, contact: 1 }, { unique: true });

module.exports = mongoose.model('Contact', ContactSchema);
