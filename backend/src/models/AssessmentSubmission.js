const mongoose = require('mongoose');

const AssessmentSubmissionSchema = new mongoose.Schema({
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  answers: [{
    questionId: { type: String, required: true },
    selectedAnswer: { type: String, default: '' },
    marksObtained: { type: Number, default: 0 }
  }],
  cheatingLogs: [{
    eventType: { type: String, enum: ['TabSwitch', 'FullscreenExit', 'NoFaceDetected'] },
    timestamp: { type: Date, default: Date.now }
  }],
  totalScore: {
    type: Number,
    default: 0,
  },
  isGraded: {
    type: Boolean,
    default: false,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AssessmentSubmission', AssessmentSubmissionSchema);
