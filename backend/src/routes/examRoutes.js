const express = require('express');
const router = express.Router();
const { createExam, getExams, deleteExam, postExamResult, getStudentResults } = require('../controllers/examController');
const { protect, restrictTo, requirePermission } = require('../middlewares/auth');

router.use(protect);

router.route('/')
  .post(restrictTo('Admin', 'Teacher'), createExam)
  .get(getExams);

router.delete('/:id', restrictTo('Admin', 'Teacher'), deleteExam);
router.post('/:id/results', requirePermission('publish_exams'), postExamResult);
router.get('/results/student/:studentId', getStudentResults);

module.exports = router;
