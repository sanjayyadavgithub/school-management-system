const mongoose = require('mongoose');

const ConcessionSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // A student has a single concession rule applied
  },
  concessionType: {
    type: String,
    enum: ['Sibling', 'Merit', 'SC/ST', 'Custom'],
    required: true,
  },
  valueType: {
    type: String,
    enum: ['Flat', 'Percentage'],
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model('Concession', ConcessionSchema);
