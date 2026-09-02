const mongoose = require('mongoose');

const FeePaymentSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  feeStructureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeeStructure',
    required: true,
  },
  amountPaid: {
    type: Number,
    required: true,
  },
  pendingAmount: {
    type: Number,
    required: true,
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Online'],
    required: true,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['Paid', 'Pending', 'Partial'],
    required: true,
  },
  paymentGateway: {
    type: String,
    enum: ['Stripe', 'Razorpay'],
  },
  gatewayOrderId: {
    type: String,
  },
  gatewayPaymentId: {
    type: String,
  },
  gatewaySignature: {
    type: String,
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Success', 'Failed'],
  },
});

module.exports = mongoose.model('FeePayment', FeePaymentSchema);
