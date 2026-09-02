const mongoose = require('mongoose');

const FeeStructureSchema = new mongoose.Schema({
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
  feeType: {
    type: String, // e.g. "Tuition", "Admission", "Lab Fee"
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  frequency: {
    type: String,
    enum: ['Monthly', 'Yearly'],
    required: true,
  },
});

module.exports = mongoose.model('FeeStructure', FeeStructureSchema);
