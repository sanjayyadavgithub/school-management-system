const express = require('express');
const router = express.Router();
const { createNotice, getNotices, deleteNotice } = require('../controllers/noticeController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

router.route('/')
  .post(restrictTo('Admin'), createNotice)
  .get(getNotices);

router.route('/:id')
  .delete(restrictTo('Admin'), deleteNotice);

module.exports = router;
