const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  name: {
    type: String, // e.g. "Mathematics"
    required: true,
  },
  code: {
    type: String, // e.g. "MAT0001"
    required: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
});

// Enforce unique subject code per school
SubjectSchema.index({ schoolId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Subject', SubjectSchema);
