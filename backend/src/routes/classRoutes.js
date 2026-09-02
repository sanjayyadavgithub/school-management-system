const express = require('express');
const router = express.Router();
const { createClass, getClasses, updateClass, deleteClass } = require('../controllers/classController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

router.route('/')
  .post(restrictTo('Admin'), createClass)
  .get(getClasses);

router.route('/:id')
  .put(restrictTo('Admin'), updateClass)
  .delete(restrictTo('Admin'), deleteClass);

module.exports = router;
