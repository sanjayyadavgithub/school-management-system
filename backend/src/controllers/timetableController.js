const Timetable = require('../models/Timetable');
const StudentProfile = require('../models/StudentProfile');
const ParentProfile = require('../models/ParentProfile');

// @desc    Create or update class timetable
// @route   POST /api/timetables
// @access  Private (Admin only)
exports.saveTimetable = async (req, res) => {
  const { classId, schedule } = req.body; // schedule: [{ day, periodNumber, startTime, endTime, subjectId, teacherId }]

  try {
    if (!classId || !schedule || !Array.isArray(schedule)) {
      return res.status(400).json({ success: false, message: 'classId and schedule array are required' });
    }

    let timetable = await Timetable.findOne({ schoolId: req.schoolId, classId });
    if (timetable) {
      timetable.schedule = schedule;
      await timetable.save();
    } else {
      timetable = await Timetable.create({
        schoolId: req.schoolId,
        classId,
        schedule,
      });
    }

    return res.status(200).json({ success: true, timetable });
  } catch (error) {
    console.error('Save timetable error:', error);
    return res.status(500).json({ success: false, message: 'Server error saving timetable' });
  }
};

// @desc    Get timetable by classId
// @route   GET /api/timetables/class/:classId
// @access  Private
exports.getTimetableByClass = async (req, res) => {
  try {
    const timetable = await Timetable.findOne({ schoolId: req.schoolId, classId: req.params.classId })
      .populate('schedule.subjectId', 'name code')
      .populate('schedule.teacherId', 'name');

    if (!timetable) {
      return res.status(200).json({ success: true, schedule: [] });
    }

    return res.status(200).json({ success: true, timetable });
  } catch (error) {
    console.error('Get class timetable error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching class timetable' });
  }
};

// @desc    Get current user's specific timetable schedule
// @route   GET /api/timetables/my-schedule
// @access  Private
exports.getMyTimetable = async (req, res) => {
  const myRole = req.user.role;
  const myId = req.user._id;

  try {
    if (myRole === 'Student') {
      const studentProfile = await StudentProfile.findOne({ userId: myId });
      if (!studentProfile) {
        return res.status(404).json({ success: false, message: 'Student profile not found' });
      }

      const timetable = await Timetable.findOne({ schoolId: req.schoolId, classId: studentProfile.classId })
        .populate('schedule.subjectId', 'name code')
        .populate('schedule.teacherId', 'name');

      return res.status(200).json({ success: true, timetable: timetable || { classId: studentProfile.classId, schedule: [] } });
    } 
    else if (myRole === 'Teacher') {
      // Find all timetable slots matching teacherId
      const timetables = await Timetable.find({
        schoolId: req.schoolId,
        'schedule.teacherId': myId
      }).populate('classId', 'name section')
        .populate('schedule.subjectId', 'name code');

      // Filter slots for this teacher
      const mySlots = [];
      timetables.forEach(t => {
        t.schedule.forEach(slot => {
          if (slot.teacherId.toString() === myId.toString()) {
            mySlots.push({
              className: `${t.classId.name} ${t.classId.section}`,
              day: slot.day,
              periodNumber: slot.periodNumber,
              startTime: slot.startTime,
              endTime: slot.endTime,
              subject: slot.subjectId,
            });
          }
        });
      });

      return res.status(200).json({ success: true, schedule: mySlots });
    } 
    else if (myRole === 'Parent') {
      // Return schedules for all child students of the parent
      const parentProfile = await ParentProfile.findOne({ userId: myId });
      if (!parentProfile || parentProfile.children.length === 0) {
        return res.status(200).json({ success: true, childrenSchedules: [] });
      }

      const studentProfiles = await StudentProfile.find({
        userId: { $in: parentProfile.children }
      }).populate('userId', 'name');

      const classIds = studentProfiles.map(sp => sp.classId);

      const timetables = await Timetable.find({
        schoolId: req.schoolId,
        classId: { $in: classIds }
      }).populate('classId', 'name section')
        .populate('schedule.subjectId', 'name code')
        .populate('schedule.teacherId', 'name');

      const childrenSchedules = studentProfiles.map(student => {
        const t = timetables.find(timeTable => timeTable.classId.toString() === student.classId.toString());
        return {
          studentId: student.userId._id,
          studentName: student.userId.name,
          timetable: t || { classId: student.classId, schedule: [] }
        };
      });

      return res.status(200).json({ success: true, childrenSchedules });
    }

    return res.status(400).json({ success: false, message: 'Role does not support direct schedule query' });
  } catch (error) {
    console.error('Get my timetable error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving your schedule' });
  }
};
