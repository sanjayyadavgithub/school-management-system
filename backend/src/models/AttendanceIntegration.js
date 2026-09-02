const mongoose = require('mongoose');

const AttendanceIntegrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  rfidTag: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  biometricId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  faceDescriptor: {
    type: [Number], // array of float values for face embedding
    default: undefined
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AttendanceIntegration', AttendanceIntegrationSchema);
