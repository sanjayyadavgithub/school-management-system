const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    // Null for SuperAdmin
    required: function() { return this.role !== 'SuperAdmin'; }
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['SuperAdmin', 'Admin', 'Teacher', 'Student', 'Parent'],
  },
  phone: {
    type: String,
    trim: true,
  },
  permissions: {
    type: [String],
    default: [], // e.g. ['mark_attendance', 'create_homework', 'publish_exams']
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  alumniDetails: {
    graduationYear: { type: Number },
    currentCompany: { type: String, trim: true },
    currentPosition: { type: String, trim: true },
    industry: { type: String, trim: true },
    linkedinUrl: { type: String, trim: true },
    isVerified: { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
