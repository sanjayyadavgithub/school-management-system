const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  name: {
    type: String, // e.g. "First Term Test", "Unit Test 1 - Science"
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
  examDate: {
    type: Date,
    required: true,
  },
  maxMarks: {
    type: Number,
    required: true,
    default: 100,
  },
  passingMarks: {
    type: Number,
    required: true,
    default: 33,
  },
  questions: [{
    questionText: { type: String, required: true },
    type: { type: String, enum: ['MCQ', 'TrueFalse', 'ShortAnswer'], default: 'ShortAnswer' },
    options: [String],
    correctAnswer: { type: String, required: true },
    marks: { type: Number, default: 5 }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Exam', ExamSchema);
