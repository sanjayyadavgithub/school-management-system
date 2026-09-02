const VideoMeeting = require('../models/VideoMeeting');
const StudentProfile = require('../models/StudentProfile');
const crypto = require('crypto');

// @desc    Schedule a video call/meeting
// @route   POST /api/meetings
// @access  Private (Admin or Teacher)
exports.scheduleMeeting = async (req, res) => {
  const { title, description, classId, meetingType, startTime, durationMinutes } = req.body;
  try {
    if (!title || !meetingType || !startTime || !durationMinutes) {
      return res.status(400).json({ success: false, message: 'Title, meetingType, startTime, and durationMinutes are required' });
    }

    // Generate unique room name to avoid collisions on public Jitsi server
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const roomName = `SMS-${req.schoolId}-${meetingType}-${randomBytes}`;
    const joinUrl = `https://meet.jit.si/${roomName}`;

    const meeting = await VideoMeeting.create({
      schoolId: req.schoolId,
      title,
      description,
      hostId: req.user._id,
      classId,
      meetingType,
      startTime: new Date(startTime),
      durationMinutes,
      roomName,
      joinUrl
    });

    return res.status(201).json({ success: true, meeting });
  } catch (error) {
    console.error('Schedule meeting error:', error);
    return res.status(500).json({ success: false, message: 'Server error scheduling meeting' });
  }
};

// @desc    Get scheduled meetings list
// @route   GET /api/meetings
// @access  Private
exports.getMeetings = async (req, res) => {
  try {
    const filter = { schoolId: req.schoolId };

    if (req.user.role === 'Student') {
      // Find student's class to only return class-relevant meetings
      const profile = await StudentProfile.findOne({ userId: req.user._id });
      if (profile) {
        filter.$or = [
          { classId: profile.classId, meetingType: 'ClassLecture' },
          { classId: profile.classId, meetingType: 'ParentTeacherMeeting' }
        ];
      } else {
        return res.status(200).json({ success: true, count: 0, meetings: [] });
      }
    } else if (req.user.role === 'Teacher') {
      // Teachers see hosted meetings or all school PTMs / StaffMeetings
      filter.$or = [
        { hostId: req.user._id },
        { meetingType: 'StaffMeeting' }
      ];
    }

    // List upcoming meetings
    const meetings = await VideoMeeting.find(filter)
      .populate('hostId', 'name email role')
      .populate('classId', 'className section')
      .sort({ startTime: 1 });

    return res.status(200).json({ success: true, count: meetings.length, meetings });
  } catch (error) {
    console.error('Get meetings error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving meetings list' });
  }
};
