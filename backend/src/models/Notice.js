const mongoose = require('mongoose');

const NoticeSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium',
  },
  authorName: {
    type: String,
    required: true,
  },
  targetRoles: {
    type: [String], // e.g. ['Teacher', 'Student', 'Parent']
    default: ['Teacher', 'Student', 'Parent'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Notice', NoticeSchema);
