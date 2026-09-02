const express = require('express');
const router = express.Router();
const { markAttendance, getAttendanceSheet, getAttendanceCalendar, getTeacherPeriodsForDate } = require('../controllers/attendanceController');
const { protect, requirePermission } = require('../middlewares/auth');

router.use(protect);

router.post('/', requirePermission('mark_attendance'), markAttendance);
router.get('/sheet', getAttendanceSheet);
router.get('/calendar', getAttendanceCalendar);
router.get('/teacher-periods', getTeacherPeriodsForDate);

module.exports = router;
