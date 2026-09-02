const express = require('express');
const router = express.Router();
const {
  createFeeStructure,
  getFeeStructures,
  addConcession,
  collectFee,
  getStudentFeeLedger,
  getFeeReport,
  exportFeeCsv
} = require('../controllers/feeController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

// Structure endpoints
router.post('/structures', restrictTo('Admin'), createFeeStructure);
router.get('/structures', getFeeStructures);

// Payment & Concession control endpoints
router.post('/concessions', restrictTo('Admin'), addConcession);
router.post('/collect', restrictTo('Admin'), collectFee);
router.get('/student/:studentId', getStudentFeeLedger);

// Analytics & Exporter endpoints
router.get('/report', restrictTo('Admin'), getFeeReport);
router.get('/report/csv', restrictTo('Admin'), exportFeeCsv);

module.exports = router;
