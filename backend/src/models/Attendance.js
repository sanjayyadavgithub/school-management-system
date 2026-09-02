const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
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
  },
  periodNumber: {
    type: Number,
    default: 1,
  },
  attendanceType: {
    type: String,
    enum: ['Daily', 'PeriodWise'],
    default: 'PeriodWise',
  },
  date: {
    type: Date, // Stored normalized without time
    required: true,
  },
  records: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late'],
      required: true,
    },
    remarks: {
      type: String,
      default: '',
    }
  }],
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for period-wise & subject-wise unique attendance per class per date
AttendanceSchema.index({ schoolId: 1, classId: 1, date: 1, periodNumber: 1, subjectId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
