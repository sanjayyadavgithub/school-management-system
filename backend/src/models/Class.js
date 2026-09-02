const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  name: {
    type: String, // e.g. "10th", "8th"
    required: true,
  },
  section: {
    type: String, // e.g. "A", "B"
    required: true,
  },
  roomNumber: {
    type: String,
  },
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Enforce unique name + section per school
ClassSchema.index({ schoolId: 1, name: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('Class', ClassSchema);
