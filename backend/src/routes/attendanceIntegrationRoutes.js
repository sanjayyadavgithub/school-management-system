const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  registerRFID,
  registerBiometric,
  registerFace,
  logRFID,
  logBiometric,
  verifyFace
} = require('../controllers/attendanceIntegrationController');

// Public routes for hardware readers (internally authenticated using hardware keys)
router.post('/log-rfid', logRFID);
router.post('/log-biometric', logBiometric);

// Protected routes for registration and client face verification
router.use(protect);
router.post('/register-rfid', registerRFID);
router.post('/register-biometric', registerBiometric);
router.post('/register-face', registerFace);
router.post('/verify-face', verifyFace);

module.exports = router;
