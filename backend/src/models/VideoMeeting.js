const mongoose = require('mongoose');

const VideoMeetingSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
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
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Teacher or Admin
    required: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class', // Optional class link
  },
  meetingType: {
    type: String,
    enum: ['ClassLecture', 'ParentTeacherMeeting', 'StaffMeeting'],
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  durationMinutes: {
    type: Number,
    required: true,
    default: 45,
  },
  joinUrl: {
    type: String,
    required: true,
  },
  roomName: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('VideoMeeting', VideoMeetingSchema);
