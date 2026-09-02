const User = require('../models/User');
const TeacherProfile = require('../models/TeacherProfile');
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

// @desc    Add a teacher and create profile
// @route   POST /api/teachers
// @access  Private (Admin only)
exports.createTeacher = async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    qualification,
    experience,
    classesAssigned, // Array of { classId, subjectId }
    permissions // Optional custom permissions override
  } = req.body;

  try {
    if (!name || !email || !password || !qualification) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, password, and qualification' });
    }

    // Check if teacher user already exists
    const teacherExists = await User.findOne({ email });
    if (teacherExists) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    // Default teacher permissions
    const defaultPermissions = permissions || [
      'mark_attendance',
      'create_homework',
      'publish_exams',
      'upload_materials'
    ];

    // Create Teacher User
    const teacherUser = await User.create({
      schoolId: req.schoolId,
      name,
      email,
      password,
      role: 'Teacher',
      phone,
      permissions: defaultPermissions,
      isActive: true,
    });

    // Create TeacherProfile
    const teacherProfile = await TeacherProfile.create({
      userId: teacherUser._id,
      qualification,
      experience: experience || 0,
      classesAssigned: classesAssigned || [],
    });

    // Send email with credentials
    const transporter = getTransporter();
    const mailOptions = {
      from: '"SMS Portal Support" <no-reply@sms-portal.com>',
      to: email,
      subject: 'Your Teacher Portal Account Credentials',
      text: `Hello ${name},\n\nYour teacher account has been created.\nLogin Email: ${email}\nPassword: ${password}\n\nAccess your dashboard to mark class attendance, create homework, and publish exams.`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Teacher credentials email sent to ${email}`);
    } catch (mailErr) {
      console.warn('Teacher credentials email failed to dispatch, logged password details:', { email, password });
    }

    return res.status(201).json({
      success: true,
      teacher: {
        id: teacherUser._id,
        name: teacherUser.name,
        email: teacherUser.email,
        qualification,
        experience,
        classesAssigned,
        permissions: teacherUser.permissions,
      }
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    return res.status(500).json({ success: false, message: 'Server error registering teacher' });
  }
};

// @desc    Get all teachers in school tenant
// @route   GET /api/teachers
// @access  Private
exports.getTeachers = async (req, res) => {
  const { search } = req.query;

  try {
    // Find all users with role Teacher under this school
    const usersQuery = { schoolId: req.schoolId, role: 'Teacher' };
    if (search) {
      usersQuery.name = { $regex: search, $options: 'i' };
    }

    const teachers = await User.find(usersQuery).select('-password');
    const teacherIds = teachers.map(t => t._id);

    // Fetch and map profiles
    const profiles = await TeacherProfile.find({ userId: { $in: teacherIds } })
      .populate('classesAssigned.classId')
      .populate('classesAssigned.subjectId');

    const result = teachers.map(teacher => {
      const profile = profiles.find(p => p.userId.toString() === teacher._id.toString());
      return {
        user: teacher,
        profileDetails: profile || null,
      };
    });

    return res.status(200).json({ success: true, count: result.length, teachers: result });
  } catch (error) {
    console.error('Get teachers error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving teachers' });
  }
};

// @desc    Update teacher profile, assignments, and permissions
// @route   PUT /api/teachers/:id
// @access  Private (Admin only)
exports.updateTeacher = async (req, res) => {
  const { name, email, phone, qualification, experience, classesAssigned, permissions, isActive } = req.body;

  try {
    const teacherUser = await User.findOne({ _id: req.params.id, schoolId: req.schoolId, role: 'Teacher' });
    if (!teacherUser) {
      return res.status(404).json({ success: false, message: 'Teacher user not found' });
    }

    const profile = await TeacherProfile.findOne({ userId: req.params.id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Teacher profile not found' });
    }

    // Update user record
    teacherUser.name = name || teacherUser.name;
    teacherUser.email = email || teacherUser.email;
    teacherUser.phone = phone || teacherUser.phone;
    if (permissions) {
      teacherUser.permissions = permissions;
    }
    if (isActive !== undefined) {
      teacherUser.isActive = isActive;
    }
    await teacherUser.save();

    // Update profile record
    profile.qualification = qualification || profile.qualification;
    profile.experience = experience !== undefined ? experience : profile.experience;
    if (classesAssigned) {
      profile.classesAssigned = classesAssigned;
    }
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Teacher updated successfully',
      teacher: {
        id: teacherUser._id,
        name: teacherUser.name,
        email: teacherUser.email,
        qualification: profile.qualification,
        classesAssigned: profile.classesAssigned,
      }
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating teacher' });
  }
};

// @desc    Delete teacher user and profile
// @route   DELETE /api/teachers/:id
// @access  Private (Admin only)
exports.deleteTeacher = async (req, res) => {
  try {
    const teacherUser = await User.findOne({ _id: req.params.id, schoolId: req.schoolId, role: 'Teacher' });
    if (!teacherUser) {
      return res.status(404).json({ success: false, message: 'Teacher user not found' });
    }

    // Delete profile and user records
    await TeacherProfile.findOneAndDelete({ userId: req.params.id });
    await User.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting teacher' });
  }
};
