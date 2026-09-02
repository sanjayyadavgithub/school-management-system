const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index chat conversations by sender/receiver and tenant schoolId
ChatMessageSchema.index({ schoolId: 1, senderId: 1, receiverId: 1, timestamp: 1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
