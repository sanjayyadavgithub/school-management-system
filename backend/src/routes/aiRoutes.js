const express = require('express');
const router = express.Router();
const {
  getSchoolInsights,
  generateFeeReminder,
  generateReportComments,
  generateEventPlan,
  generateNotice,
  generateQuiz
} = require('../controllers/aiController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

router.post('/insights', getSchoolInsights);
router.post('/fee-reminder', restrictTo('Admin'), generateFeeReminder);
router.post('/report-comment', restrictTo('Admin', 'Teacher'), generateReportComments);
router.post('/event-planner', restrictTo('Admin', 'Teacher'), generateEventPlan);
router.post('/notice-generator', restrictTo('Admin'), generateNotice);
router.post('/quiz-generator', generateQuiz);

module.exports = router;
