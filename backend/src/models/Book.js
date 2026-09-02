const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema({
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
  author: {
    type: String,
    required: true,
    trim: true,
  },
  publisher: {
    type: String,
    trim: true,
  },
  isbn: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['Physical', 'Ebook'],
    required: true,
  },
  fileUrl: {
    type: String, // PDF or EPUB url if type is Ebook
    trim: true,
  },
  totalCopies: {
    type: Number,
    required: true,
    default: 1,
  },
  availableCopies: {
    type: Number,
    required: true,
    default: 1,
  },
  shelfLocation: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Book', BookSchema);
