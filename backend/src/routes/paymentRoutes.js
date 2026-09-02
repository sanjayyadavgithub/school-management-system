const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { createOrder, stripeWebhook, razorpayWebhook, mockRedirect } = require('../controllers/paymentController');

// Public route for sandbox redirection
router.get('/mock-redirect', mockRedirect);

// Webhook endpoints (need raw parser if matching signature exactly, or basic JSON in fallback)
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhook);
router.post('/webhook/razorpay', express.json(), razorpayWebhook);

// Protected routes
router.post('/create-order', protect, createOrder);

module.exports = router;
