const express = require('express');
const router = express.Router();
const { saveTimetable, getTimetableByClass, getMyTimetable } = require('../controllers/timetableController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

router.post('/', restrictTo('Admin'), saveTimetable);
router.get('/class/:classId', getTimetableByClass);
router.get('/my-schedule', getMyTimetable);

module.exports = router;
