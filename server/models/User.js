// server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  avatar: String,
  banner: String
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

