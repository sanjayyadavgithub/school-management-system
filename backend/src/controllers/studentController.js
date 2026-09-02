const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const ParentProfile = require('../models/ParentProfile');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const ExamResult = require('../models/ExamResult');
const FeePayment = require('../models/FeePayment');
const nodemailer = require('nodemailer');

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '2525'),
    auth: {
      user: process.env.SMTP_USER || 'mock',
      pass: process.env.SMTP_PASS || 'mock',
    },
  });
};

// @desc    Register a student and associate/create parent account
// @route   POST /api/students
// @access  Private (Admin only)
exports.createStudent = async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    classId,
    rollNumber,
    parentName,
    parentEmail,
    parentPhone
  } = req.body;

  try {
    if (!name || !email || !password || !classId || !rollNumber || !parentEmail || !parentName) {
      return res.status(400).json({ success: false, message: 'Please provide all required student and parent fields' });
    }

    // Verify target class exists
    const classExists = await Class.findOne({ _id: classId, schoolId: req.schoolId });
    if (!classExists) {
      return res.status(404).json({ success: false, message: 'Class section not found' });
    }

    // Check if student email is already registered
    const studentExists = await User.findOne({ email });
    if (studentExists) {
      return res.status(400).json({ success: false, message: 'A user with this student email already exists' });
    }

    // Find or create Parent User
    let parentUser = await User.findOne({ email: parentEmail });
    const parentPassword = Math.random().toString(36).slice(-8); // Generate random password for parent

    if (!parentUser) {
      parentUser = await User.create({
        schoolId: req.schoolId,
        name: parentName,
        email: parentEmail,
        password: parentPassword,
        role: 'Parent',
        phone: parentPhone,
        isActive: true,
      });

      // Create ParentProfile
      await ParentProfile.create({
        userId: parentUser._id,
        children: [],
      });
    }

    // Create Student User
    const studentUser = await User.create({
      schoolId: req.schoolId,
      name,
      email,
      password,
      role: 'Student',
      phone,
      isActive: true,
    });

    // Create StudentProfile
    const studentProfile = await StudentProfile.create({
      userId: studentUser._id,
      rollNumber,
      classId,
      parentId: parentUser._id,
    });

    // Link student to parent's child list
    await ParentProfile.updateOne(
      { userId: parentUser._id },
      { $addToSet: { children: studentUser._id } }
    );

    // Send emails with account credentials
    const transporter = getTransporter();
    const studentMailOptions = {
      from: '"SMS Portal Support" <no-reply@sms-portal.com>',
      to: email,
      subject: 'Your Student Portal Account Credentials',
      text: `Hello ${name},\n\nYour student account has been created.\nLogin Email: ${email}\nPassword: ${password}\n\nAccess your dashboard to view timetables and homework.`,
    };
    const parentMailOptions = {
      from: '"SMS Portal Support" <no-reply@sms-portal.com>',
      to: parentEmail,
      subject: 'Your Parent Portal Account Credentials',
      text: `Hello ${parentName},\n\nYour parent account has been created to monitor your child: ${name}.\nLogin Email: ${parentEmail}\nPassword: ${parentPassword}\n\nUse these credentials to view attendance, marks, and manage fees.`,
    };

    try {
      await transporter.sendMail(studentMailOptions);
      await transporter.sendMail(parentMailOptions);
      console.log(`Student and parent credentials sent via mail successfully.`);
    } catch (mailErr) {
      console.warn('Mail dispatch failed, logging details: ', { studentEmail: email, studentPass: password, parentEmail, parentPass: parentPassword });
    }

    return res.status(201).json({
      success: true,
      student: {
        id: studentUser._id,
        name: studentUser.name,
        email: studentUser.email,
        rollNumber,
        classId,
        parentId: parentUser._id,
      }
    });
  } catch (error) {
    console.error('Create student error:', error);
    return res.status(500).json({ success: false, message: 'Server error registering student' });
  }
};

// @desc    Get all students (with class & roll filters)
// @route   GET /api/students
// @access  Private
exports.getStudents = async (req, res) => {
  const { classId, search, status } = req.query;

  try {
    // 1. Fetch student users belonging strictly to this school tenant
    const tenantStudents = await User.find({ schoolId: req.schoolId, role: 'Student' }).select('_id');
    const tenantStudentIds = tenantStudents.map(s => s._id);

    // 2. Build initial query matching tenant student user IDs
    const studentProfilesQuery = { userId: { $in: tenantStudentIds } };
    if (classId) {
      studentProfilesQuery.classId = classId;
    }

    // Find profiles first
    let studentProfiles = await StudentProfile.find(studentProfilesQuery)
      .populate('classId')
      .populate({ path: 'userId', select: 'name email phone isActive schoolId' })
      .populate({ path: 'parentId', select: 'name email phone' });

    // Filter by search matching student name, email or rollNumber
    if (search || status) {
      studentProfiles = studentProfiles.filter(profile => {
        if (!profile.userId) return false;
        
        let matchesSearch = true;
        if (search) {
          const s = search.toLowerCase();
          const nameMatch = profile.userId.name.toLowerCase().includes(s);
          const emailMatch = profile.userId.email.toLowerCase().includes(s);
          const rollMatch = profile.rollNumber.toLowerCase().includes(s);
          matchesSearch = nameMatch || emailMatch || rollMatch;
        }

        let matchesStatus = true;
        if (status) {
          const isActiveVal = status === 'active';
          matchesStatus = profile.userId.isActive === isActiveVal;
        }

        return matchesSearch && matchesStatus;
      });
    }

    return res.status(200).json({ success: true, count: studentProfiles.length, students: studentProfiles });
  } catch (error) {
    console.error('Get students error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving students' });
  }
};

// @desc    Get detailed student profile (attendance rate, exam results, fee history)
// @route   GET /api/students/:id/profile
// @access  Private
exports.getStudentProfile = async (req, res) => {
  const studentUserId = req.params.id;

  try {
    const studentUser = await User.findOne({ _id: studentUserId, schoolId: req.schoolId }).select('-password');
    if (!studentUser) {
      return res.status(404).json({ success: false, message: 'Student account not found' });
    }

    const profile = await StudentProfile.findOne({ userId: studentUserId })
      .populate('classId')
      .populate({ path: 'parentId', select: 'name email phone' });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile details not found' });
    }

    // 1. Fetch Attendance Stats
    const attendances = await Attendance.find({
      schoolId: req.schoolId,
      classId: profile.classId._id,
      'records.studentId': studentUserId
    });

    let present = 0, absent = 0, late = 0;
    attendances.forEach(att => {
      const record = att.records.find(r => r.studentId.toString() === studentUserId.toString());
      if (record) {
        if (record.status === 'Present') present++;
        else if (record.status === 'Absent') absent++;
        else if (record.status === 'Late') late++;
      }
    });

    const totalDays = present + absent + late;
    const attendanceRate = totalDays > 0 ? Math.round((present / totalDays) * 100) : 100;

    // 2. Fetch Exam Results
    const examResults = await ExamResult.find({ schoolId: req.schoolId, studentId: studentUserId })
      .populate({ path: 'examId', populate: { path: 'subjectId', select: 'name code' } });

    // 3. Fetch Fee Payment Ledgers
    const feePayments = await FeePayment.find({ schoolId: req.schoolId, studentId: studentUserId })
      .populate('feeStructureId');

    return res.status(200).json({
      success: true,
      profile: {
        user: studentUser,
        details: profile,
        stats: {
          attendance: {
            rate: attendanceRate,
            present,
            absent,
            late,
            totalDays
          },
          exams: examResults,
          fees: feePayments
        }
      }
    });
  } catch (error) {
    console.error('Get student detailed profile error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching student profile' });
  }
};

// @desc    Update student user/profile details
// @route   PUT /api/students/:id
// @access  Private (Admin only)
exports.updateStudent = async (req, res) => {
  const { name, email, phone, rollNumber, classId, isActive } = req.body;

  try {
    const studentUser = await User.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!studentUser) {
      return res.status(404).json({ success: false, message: 'Student user not found' });
    }

    const studentProfile = await StudentProfile.findOne({ userId: req.params.id });
    if (!studentProfile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    // Update base user details
    studentUser.name = name || studentUser.name;
    studentUser.email = email || studentUser.email;
    studentUser.phone = phone || studentUser.phone;
    if (isActive !== undefined) {
      studentUser.isActive = isActive;
    }
    await studentUser.save();

    // Update profile details
    studentProfile.rollNumber = rollNumber || studentProfile.rollNumber;
    if (classId) {
      // Verify class exists
      const classExists = await Class.findOne({ _id: classId, schoolId: req.schoolId });
      if (classExists) {
        studentProfile.classId = classId;
      }
    }
    await studentProfile.save();

    return res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      student: {
        id: studentUser._id,
        name: studentUser.name,
        email: studentUser.email,
        rollNumber: studentProfile.rollNumber,
        classId: studentProfile.classId,
      }
    });
  } catch (error) {
    console.error('Update student error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating student' });
  }
};

// @desc    Delete student user and profile
// @route   DELETE /api/students/:id
// @access  Private (Admin only)
exports.deleteStudent = async (req, res) => {
  try {
    const studentUser = await User.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!studentUser) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const profile = await StudentProfile.findOne({ userId: req.params.id });
    if (profile) {
      // Remove from parent's children list
      await ParentProfile.updateOne(
        { userId: profile.parentId },
        { $pull: { children: studentUser._id } }
      );
      await StudentProfile.findByIdAndDelete(profile._id);
    }

    // Remove user record
    await User.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting student' });
  }
};
