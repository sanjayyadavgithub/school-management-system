const mongoose = require('mongoose');

const CertificateTemplateSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  htmlContent: {
    type: String, // HTML/CSS layout template with dynamic placeholders (e.g. {{name}}, {{title}}, {{date}})
    required: true,
  },
  signatureUrl: {
    type: String, // optional signature image URL
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('CertificateTemplate', CertificateTemplateSchema);
