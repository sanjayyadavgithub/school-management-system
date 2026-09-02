const express = require('express');
const router = express.Router();
const { createStudent, getStudents, getStudentProfile, updateStudent, deleteStudent } = require('../controllers/studentController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

router.route('/')
  .post(restrictTo('Admin'), createStudent)
  .get(getStudents);

router.route('/:id')
  .put(restrictTo('Admin'), updateStudent)
  .delete(restrictTo('Admin'), deleteStudent);

router.route('/:id/profile')
  .get(getStudentProfile);

module.exports = router;
