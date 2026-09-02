const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  createAssessment,
  getAssessments,
  submitAssessment,
  logViolation
} = require('../controllers/assessmentController');

router.use(protect);

router.post('/', restrictTo('Admin', 'Teacher'), createAssessment);
router.get('/', getAssessments);
router.post('/:id/submit', submitAssessment);
router.post('/:id/log-violation', logViolation);

module.exports = router;
