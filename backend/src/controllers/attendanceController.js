const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const StudentProfile = require('../models/StudentProfile');
const Timetable = require('../models/Timetable');
const User = require('../models/User');
const Subject = require('../models/Subject');

// Normalize date to remove time part for strict day matching
const normalizeDate = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Map JS day index to Timetable day string
const getDayName = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getUTCDay()];
};

// @desc    Get timetable periods assigned for a class & date (Filtered by Teacher if logged in as Teacher)
// @route   GET /api/attendance/teacher-periods
// @access  Private (Teacher & Admin)
exports.getTeacherPeriodsForDate = async (req, res) => {
  const { classId, date } = req.query;

  try {
    if (!classId || !date || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: 'Valid classId and date parameters are required' });
    }

    const dayName = getDayName(date);
    const timetable = await Timetable.findOne({ schoolId: req.schoolId, classId })
      .populate('schedule.subjectId', 'name code')
      .populate('schedule.teacherId', 'name email');

    if (!timetable || !timetable.schedule || timetable.schedule.length === 0) {
      return res.status(200).json({
        success: true,
        dayName,
        periods: [],
        message: `No timetable slots configured for ${dayName}`
      });
    }

    // Filter schedule for the day
    let daySlots = timetable.schedule.filter(slot => slot.day === dayName);

    // If teacher role, filter slots where teacher matches logged-in user
    if (req.user && req.user.role === 'Teacher') {
      const teacherSlots = daySlots.filter(slot => {
        const tId = slot.teacherId ? (slot.teacherId._id || slot.teacherId).toString() : null;
        return tId === req.user._id.toString();
      });
      
      if (teacherSlots.length > 0) {
        daySlots = teacherSlots;
      }
    }

    return res.status(200).json({
      success: true,
      dayName,
      periods: daySlots
    });
  } catch (error) {
    console.error('Get teacher periods error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving teacher periods: ' + error.message });
  }
};

// @desc    Mark or Update period-wise/subject-wise attendance for a class
// @route   POST /api/attendance
// @access  Private (Admin or Teacher with mark_attendance permission)
exports.markAttendance = async (req, res) => {
  const { classId, subjectId, periodNumber, date, records, attendanceType } = req.body;

  try {
    if (!classId || !date || !records || !Array.isArray(records) || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: 'Valid classId, date, and records array are required' });
    }

    // Verify class exists in school
    const classExists = await Class.findOne({ _id: classId, schoolId: req.schoolId });
    if (!classExists) {
      return res.status(404).json({ success: false, message: 'Class section not found' });
    }

    const attendanceDate = normalizeDate(date);
    const pNumber = (periodNumber && !isNaN(parseInt(periodNumber))) ? parseInt(periodNumber) : 1;

    const query = {
      schoolId: req.schoolId,
      classId,
      date: attendanceDate,
      periodNumber: pNumber,
    };

    const validSubjectId = (subjectId && subjectId !== 'undefined' && subjectId !== 'null' && subjectId !== '' && mongoose.Types.ObjectId.isValid(subjectId)) ? subjectId : undefined;
    if (validSubjectId) {
      query.subjectId = validSubjectId;
    }

    // Filter out invalid records where studentId is missing or empty
    const validRecords = records
      .filter(r => r.studentId && mongoose.Types.ObjectId.isValid(r.studentId._id || r.studentId))
      .map(r => ({
        studentId: r.studentId._id || r.studentId,
        status: r.status || 'Present',
        remarks: r.remarks || ''
      }));

    // Look for existing sheet
    let attendanceSheet = await Attendance.findOne(query);

    if (attendanceSheet) {
      // Update existing record
      attendanceSheet.records = validRecords;
      attendanceSheet.markedBy = req.user._id;
      if (validSubjectId) attendanceSheet.subjectId = validSubjectId;
      if (attendanceType) attendanceSheet.attendanceType = attendanceType;
      await attendanceSheet.save();
    } else {
      // Create new sheet
      attendanceSheet = await Attendance.create({
        schoolId: req.schoolId,
        classId,
        subjectId: validSubjectId,
        periodNumber: pNumber,
        attendanceType: attendanceType || (validSubjectId ? 'PeriodWise' : 'Daily'),
        date: attendanceDate,
        records: validRecords,
        markedBy: req.user._id,
      });
    }

    // Trigger parental alert notifications for absent students
    try {
      const absentRecords = validRecords.filter(r => r.status === 'Absent');
      if (absentRecords.length > 0) {
        const { sendAttendanceAlert } = require('../services/whatsappService');
        for (const record of absentRecords) {
          const profile = await StudentProfile.findOne({ userId: record.studentId }).populate('userId parentId');
          if (profile && profile.parentId) {
            sendAttendanceAlert(profile.parentId, profile.userId.name, attendanceDate, 'Absent').catch(e => console.error('Alert trigger failed:', e.message));
          }
        }
      }
    } catch (alertError) {
      console.error('Notifications trigger warning:', alertError.message);
    }

    return res.status(200).json({ success: true, message: 'Period-wise attendance marked successfully', attendanceSheet });
  } catch (error) {
    console.error('Mark attendance error:', error);
    return res.status(500).json({ success: false, message: 'Server error marking attendance: ' + error.message });
  }
};

// @desc    Get attendance sheet for a class on a specific date, period, and subject
// @route   GET /api/attendance/sheet
// @access  Private
exports.getAttendanceSheet = async (req, res) => {
  const { classId, date, subjectId, periodNumber } = req.query;

  try {
    if (!classId || !date || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: 'Valid classId and date parameters are required' });
    }

    const attendanceDate = normalizeDate(date);
    const query = {
      schoolId: req.schoolId,
      classId,
      date: attendanceDate
    };

    if (periodNumber && !isNaN(parseInt(periodNumber))) {
      query.periodNumber = parseInt(periodNumber);
    }
    if (subjectId && subjectId !== 'undefined' && subjectId !== 'null' && subjectId !== '' && mongoose.Types.ObjectId.isValid(subjectId)) {
      query.subjectId = subjectId;
    }

    let sheet = await Attendance.findOne(query)
      .populate('records.studentId', 'name email')
      .populate('subjectId', 'name code')
      .populate('markedBy', 'name role');

    // If no specific period sheet exists, return student list to allow creation
    if (!sheet) {
      const tenantStudents = await User.find({ schoolId: req.schoolId, role: 'Student' }).select('_id name email');
      const tenantStudentIds = tenantStudents.map(s => s._id);

      const studentProfiles = await StudentProfile.find({ classId, userId: { $in: tenantStudentIds } })
        .populate('userId', 'name email');

      let defaultRecords = [];
      if (studentProfiles.length > 0) {
        defaultRecords = studentProfiles
          .filter(p => p.userId != null)
          .map(profile => ({
            studentId: profile.userId,
            status: 'Present',
            remarks: ''
          }));
      } else {
        // Fallback: Return all tenant student users
        defaultRecords = tenantStudents.map(u => ({
          studentId: u,
          status: 'Present',
          remarks: ''
        }));
      }

      return res.status(200).json({
        success: true,
        exists: false,
        records: defaultRecords
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      records: sheet.records.filter(r => r.studentId != null),
      markedBy: sheet.markedBy,
      subjectId: sheet.subjectId,
      periodNumber: sheet.periodNumber,
      sheetId: sheet._id
    });
  } catch (error) {
    console.error('Get attendance sheet error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving attendance sheet: ' + error.message });
  }
};

// @desc    Get attendance calendar status for a class and month
// @route   GET /api/attendance/calendar
// @access  Private
exports.getAttendanceCalendar = async (req, res) => {
  const { classId, year, month } = req.query;

  try {
    if (!classId || !year || !month || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: 'Valid classId, year, and month are required' });
    }

    const startDate = new Date(Date.UTC(year, month, 1));
    const endDate = new Date(Date.UTC(year, parseInt(month) + 1, 0, 23, 59, 59, 999));

    const sheets = await Attendance.find({
      schoolId: req.schoolId,
      classId,
      date: { $gte: startDate, $lte: endDate }
    }).populate('subjectId', 'name code').select('date periodNumber subjectId records');

    const summary = sheets.map(sheet => {
      let present = 0, absent = 0, late = 0;
      sheet.records.forEach(rec => {
        if (rec.status === 'Present') present++;
        else if (rec.status === 'Absent') absent++;
        else if (rec.status === 'Late') late++;
      });
      return {
        date: sheet.date,
        periodNumber: sheet.periodNumber,
        subject: sheet.subjectId ? sheet.subjectId.name : 'Daily',
        counts: { present, absent, late, total: sheet.records.length }
      };
    });

    return res.status(200).json({ success: true, calendar: summary });
  } catch (error) {
    console.error('Get attendance calendar error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching attendance calendar: ' + error.message });
  }
};
