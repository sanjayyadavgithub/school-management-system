const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  uploadLecture,
  getLectures,
  submitHomework
} = require('../controllers/lmsController');

// Secure all LMS endpoints
router.use(protect);

router.post('/lectures', restrictTo('Admin', 'Teacher'), uploadLecture);
router.get('/lectures', getLectures);

// Submit homework submission
router.post('/homework/:homeworkId/submit', submitHomework);

module.exports = router;
