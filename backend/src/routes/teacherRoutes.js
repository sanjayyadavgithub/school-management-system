const express = require('express');
const router = express.Router();
const { createTeacher, getTeachers, updateTeacher, deleteTeacher } = require('../controllers/teacherController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

router.route('/')
  .post(restrictTo('Admin'), createTeacher)
  .get(getTeachers);

router.route('/:id')
  .put(restrictTo('Admin'), updateTeacher)
  .delete(restrictTo('Admin'), deleteTeacher);

module.exports = router;
