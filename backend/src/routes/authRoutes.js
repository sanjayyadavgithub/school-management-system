const express = require('express');
const router = express.Router();
const { registerSchool, verifyOtp, login, getMe } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

// Public onboarding & login routes
router.post('/register-school', registerSchool);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);

// Private session verification route
router.get('/me', protect, getMe);

module.exports = router;
