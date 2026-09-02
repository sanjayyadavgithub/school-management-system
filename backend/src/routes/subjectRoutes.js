const express = require('express');
const router = express.Router();
const { createSubject, getSubjects, updateSubject, deleteSubject } = require('../controllers/subjectController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

router.route('/')
  .post(restrictTo('Admin', 'SuperAdmin'), createSubject)
  .get(getSubjects);

router.route('/:id')
  .put(restrictTo('Admin', 'SuperAdmin'), updateSubject)
  .delete(restrictTo('Admin', 'SuperAdmin'), deleteSubject);

module.exports = router;
