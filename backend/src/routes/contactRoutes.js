const express = require('express');
const router = express.Router();
const { submitInquiry, getInquiries, updateInquiryStatus, deleteInquiry } = require('../controllers/contactController');
const { protect, restrictTo } = require('../middlewares/auth');

// Public route for landing page submissions
router.post('/', submitInquiry);

// Protected routes for SuperAdmin
router.get('/', protect, restrictTo('SuperAdmin'), getInquiries);
router.patch('/:id/status', protect, restrictTo('SuperAdmin'), updateInquiryStatus);
router.delete('/:id', protect, restrictTo('SuperAdmin'), deleteInquiry);

module.exports = router;
