const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  createTemplate,
  issueCertificate,
  renderCertificate,
  verifyCertificate,
  getMyCertificates
} = require('../controllers/certificateController');

// Public endpoints (no token verification required)
router.get('/render/:id', renderCertificate);
router.get('/verify/:uniqueId', verifyCertificate);

// Protected endpoints
router.get('/my', protect, getMyCertificates);
router.post('/templates', protect, restrictTo('Admin'), createTemplate);
router.post('/issue', protect, restrictTo('Admin'), issueCertificate);

module.exports = router;
