const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  server: { type: mongoose.Schema.Types.ObjectId, ref: 'Server', required: true },
  channel: { type: String, required: true },
  user: { type: String, required: true },
  message: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
