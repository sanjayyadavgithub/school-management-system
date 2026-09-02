const mongoose = require('mongoose');

const ParentProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // User with role Student
  }],
});

module.exports = mongoose.model('ParentProfile', ParentProfileSchema);
