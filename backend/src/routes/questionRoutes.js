const express = require('express');
const router = express.Router();
const { createQuestion, getQuestions, deleteQuestion } = require('../controllers/questionController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

router.route('/')
  .post(restrictTo('Admin', 'Teacher'), createQuestion)
  .get(getQuestions);

router.delete('/:id', restrictTo('Admin', 'Teacher'), deleteQuestion);

module.exports = router;
