const mongoose = require('mongoose');

const ExamResultSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // User with role Student
    required: true,
  },
  marksObtained: {
    type: Number,
    required: true,
  },
  grade: {
    type: String, // e.g. "A+", "B", "F"
    required: true,
  },
  remarks: {
    type: String,
    default: '',
  },
});

// Enforce unique result sheet entry per student per exam
ExamResultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('ExamResult', ExamResultSchema);
