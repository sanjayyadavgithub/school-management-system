const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    unique: true, // One timetable per class cohort
  },
  schedule: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      required: true,
    },
    periodNumber: {
      type: Number,
      required: true,
    },
    startTime: {
      type: String, // e.g. "08:30"
      required: true,
    },
    endTime: {
      type: String, // e.g. "09:15"
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // User with role Teacher
      required: true,
    }
  }],
});

module.exports = mongoose.model('Timetable', TimetableSchema);
