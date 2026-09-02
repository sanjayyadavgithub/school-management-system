const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const { scheduleMeeting, getMeetings } = require('../controllers/videoMeetingController');

router.use(protect);

router.post('/', restrictTo('Admin', 'Teacher'), scheduleMeeting);
router.get('/', getMeetings);

module.exports = router;
