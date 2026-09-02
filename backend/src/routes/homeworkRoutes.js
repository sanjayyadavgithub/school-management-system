const express = require('express');
const router = express.Router();
const { createHomework, getHomework, submitHomework, gradeHomework } = require('../controllers/homeworkController');
const { protect, restrictTo, requirePermission } = require('../middlewares/auth');
const { upload, uploadToCloud } = require('../middlewares/upload');

router.use(protect);

// Get and create homework
router.route('/')
  .post(requirePermission('create_homework'), upload.single('file'), uploadToCloud, createHomework)
  .get(getHomework);

// Student submission endpoint
router.post('/:id/submit', restrictTo('Student'), upload.single('file'), uploadToCloud, submitHomework);

// Teacher grading endpoint
router.patch('/:id/grade', requirePermission('create_homework'), gradeHomework);

module.exports = router;
