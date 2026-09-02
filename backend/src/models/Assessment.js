const mongoose = require('mongoose');

const AssessmentSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  durationMinutes: {
    type: Number,
    required: true,
    default: 30,
  },
  questions: [{
    questionText: { type: String, required: true },
    type: { type: String, enum: ['MCQ', 'TrueFalse', 'ShortAnswer'], required: true },
    options: [String], // only for MCQs
    correctAnswer: { type: String, required: true }, // exact matching for auto-grading
    marks: { type: Number, required: true, default: 1 }
  }],
  totalMarks: {
    type: Number,
    required: true,
    default: 0,
  },
  passPercentage: {
    type: Number,
    required: true,
    default: 40,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Assessment', AssessmentSchema);
