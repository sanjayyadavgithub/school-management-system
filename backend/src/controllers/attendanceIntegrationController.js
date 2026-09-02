const Attendance = require('../models/Attendance');
const AttendanceIntegration = require('../models/AttendanceIntegration');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');

const normalizeDate = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Helper function to mark attendance for a student on a specific date
const markIndividualAttendance = async (schoolId, userId, date, markedBy) => {
  const normalized = normalizeDate(date);

  // Get student's class
  const studentProfile = await StudentProfile.findOne({ userId });
  if (!studentProfile) {
    throw new Error('Student profile not found');
  }

  const { classId } = studentProfile;

  // Find or create attendance sheet
  let sheet = await Attendance.findOne({
    schoolId,
    classId,
    date: normalized
  });

  if (sheet) {
    // Check if student record exists in sheet
    const recordIndex = sheet.records.findIndex(
      (r) => r.studentId.toString() === userId.toString()
    );

    if (recordIndex >= 0) {
      sheet.records[recordIndex].status = 'Present';
      sheet.records[recordIndex].remarks = 'Marked by Auto-Attendance';
    } else {
      sheet.records.push({
        studentId: userId,
        status: 'Present',
        remarks: 'Marked by Auto-Attendance'
      });
    }
    sheet.markedBy = markedBy;
    await sheet.save();
  } else {
    // If no sheet, get all students in that class to initialize sheet
    const studentProfiles = await StudentProfile.find({ classId });
    const records = studentProfiles.map((profile) => ({
      studentId: profile.userId,
      status: profile.userId.toString() === userId.toString() ? 'Present' : 'Absent',
      remarks: profile.userId.toString() === userId.toString() ? 'Marked by Auto-Attendance' : 'Auto-initialized as Absent'
    }));

    sheet = await Attendance.create({
      schoolId,
      classId,
      date: normalized,
      records,
      markedBy
    });
  }

  return sheet;
};

// @desc    Register RFID Tag for User
// @route   POST /api/attendance/integration/register-rfid
// @access  Private (Admin)
exports.registerRFID = async (req, res) => {
  const { userId, rfidTag } = req.body;
  try {
    if (!userId || !rfidTag) {
      return res.status(400).json({ success: false, message: 'userId and rfidTag are required' });
    }

    let integration = await AttendanceIntegration.findOne({ userId });
    if (integration) {
      integration.rfidTag = rfidTag;
      await integration.save();
    } else {
      integration = await AttendanceIntegration.create({
        userId,
        schoolId: req.schoolId,
        rfidTag
      });
    }

    return res.status(200).json({ success: true, message: 'RFID tag registered successfully', integration });
  } catch (error) {
    console.error('Register RFID error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error registering RFID' });
  }
};

// @desc    Register Biometric ID for User
// @route   POST /api/attendance/integration/register-biometric
// @access  Private (Admin)
exports.registerBiometric = async (req, res) => {
  const { userId, biometricId } = req.body;
  try {
    if (!userId || !biometricId) {
      return res.status(400).json({ success: false, message: 'userId and biometricId are required' });
    }

    let integration = await AttendanceIntegration.findOne({ userId });
    if (integration) {
      integration.biometricId = biometricId;
      await integration.save();
    } else {
      integration = await AttendanceIntegration.create({
        userId,
        schoolId: req.schoolId,
        biometricId
      });
    }

    return res.status(200).json({ success: true, message: 'Biometric ID registered successfully', integration });
  } catch (error) {
    console.error('Register Biometric error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error registering Biometric' });
  }
};

// @desc    Register Face Descriptor for User
// @route   POST /api/attendance/integration/register-face
// @access  Private (Admin/Teacher/Student)
exports.registerFace = async (req, res) => {
  const { userId, faceDescriptor } = req.body; // faceDescriptor: Array of 128 numbers
  try {
    if (!userId || !faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ success: false, message: 'userId and faceDescriptor array are required' });
    }

    let integration = await AttendanceIntegration.findOne({ userId });
    if (integration) {
      integration.faceDescriptor = faceDescriptor;
      await integration.save();
    } else {
      integration = await AttendanceIntegration.create({
        userId,
        schoolId: req.schoolId,
        faceDescriptor
      });
    }

    return res.status(200).json({ success: true, message: 'Face descriptor registered successfully', integration });
  } catch (error) {
    console.error('Register Face error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error registering Face' });
  }
};

// @desc    Receive Log from RFID Hardware reader
// @route   POST /api/attendance/integration/log-rfid
// @access  Public (Secured with api key)
exports.logRFID = async (req, res) => {
  const { rfidTag, apiKey, schoolId } = req.body;
  try {
    // simple api key verification (in real life from env or school config)
    if (!apiKey || apiKey !== (process.env.HARDWARE_API_KEY || 'sms-hardware-secret-key-999')) {
      return res.status(401).json({ success: false, message: 'Unauthorized hardware log request' });
    }

    if (!rfidTag || !schoolId) {
      return res.status(400).json({ success: false, message: 'rfidTag and schoolId are required' });
    }

    const integration = await AttendanceIntegration.findOne({ rfidTag, schoolId });
    if (!integration) {
      return res.status(404).json({ success: false, message: 'RFID Tag not registered' });
    }

    // Mark attendance (markedBy is system user/admin or first seeded admin)
    const adminUser = await User.findOne({ schoolId, role: 'Admin' });
    const markedBy = adminUser ? adminUser._id : integration.userId;

    const sheet = await markIndividualAttendance(schoolId, integration.userId, new Date(), markedBy);

    return res.status(200).json({ success: true, message: 'Attendance logged successfully via RFID', sheet });
  } catch (error) {
    console.error('Log RFID error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error logging RFID' });
  }
};

// @desc    Receive Log from Biometric Hardware reader
// @route   POST /api/attendance/integration/log-biometric
// @access  Public (Secured with api key)
exports.logBiometric = async (req, res) => {
  const { biometricId, apiKey, schoolId } = req.body;
  try {
    if (!apiKey || apiKey !== (process.env.HARDWARE_API_KEY || 'sms-hardware-secret-key-999')) {
      return res.status(401).json({ success: false, message: 'Unauthorized hardware log request' });
    }

    if (!biometricId || !schoolId) {
      return res.status(400).json({ success: false, message: 'biometricId and schoolId are required' });
    }

    const integration = await AttendanceIntegration.findOne({ biometricId, schoolId });
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Biometric ID not registered' });
    }

    const adminUser = await User.findOne({ schoolId, role: 'Admin' });
    const markedBy = adminUser ? adminUser._id : integration.userId;

    const sheet = await markIndividualAttendance(schoolId, integration.userId, new Date(), markedBy);

    return res.status(200).json({ success: true, message: 'Attendance logged successfully via Biometrics', sheet });
  } catch (error) {
    console.error('Log Biometric error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error logging Biometric' });
  }
};

// Euclidean distance helper for face matching
const euclideanDistance = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return Infinity;
  return Math.sqrt(arr1.reduce((sum, val, i) => sum + Math.pow(val - arr2[i], 2), 0));
};

// @desc    Match client-side Face Descriptor
// @route   POST /api/attendance/integration/verify-face
// @access  Private
exports.verifyFace = async (req, res) => {
  const { faceDescriptor } = req.body; // array of 128 numbers
  try {
    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ success: false, message: 'Valid faceDescriptor (128 array) is required' });
    }

    // Get all integrations with face descriptors for this school
    const integrations = await AttendanceIntegration.find({
      schoolId: req.schoolId,
      faceDescriptor: { $exists: true }
    });

    let bestMatch = null;
    let minDistance = 0.6; // Threshold for face matching

    for (const integration of integrations) {
      const distance = euclideanDistance(faceDescriptor, integration.faceDescriptor);
      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = integration;
      }
    }

    if (!bestMatch) {
      return res.status(404).json({ success: false, message: 'Face did not match any registered records' });
    }

    const sheet = await markIndividualAttendance(req.schoolId, bestMatch.userId, new Date(), req.user._id);

    const user = await User.findById(bestMatch.userId).select('name role');

    return res.status(200).json({
      success: true,
      message: `Face matched successfully with ${user.name}`,
      matchedUser: user,
      distance: minDistance,
      sheet
    });
  } catch (error) {
    console.error('Verify face error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error verifying face' });
  }
};
