const mongoose = require('mongoose');

const TeacherProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  qualification: {
    type: String,
    required: true,
  },
  experience: {
    type: Number, // In years
    default: 0,
  },
  classesAssigned: [{
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    }
  }],
});

module.exports = mongoose.model('TeacherProfile', TeacherProfileSchema);
