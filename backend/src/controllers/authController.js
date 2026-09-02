const jwt = require('jsonwebtoken');
const School = require('../models/School');
const User = require('../models/User');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtsmskey123!';

// Nodemailer Transporter
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

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, schoolId: user.schoolId, permissions: user.permissions },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// @desc    Register a new school (SaaS Onboarding)
// @route   POST /api/auth/register-school
// @access  Public
exports.registerSchool = async (req, res) => {
  const { schoolName, address, email, phone } = req.body;

  try {
    if (!schoolName || !address || !email) {
      return res.status(400).json({ success: false, message: 'Required fields: schoolName, address, email' });
    }

    // Check if school already exists
    let existingSchool = await School.findOne({ email });
    if (existingSchool) {
      return res.status(400).json({ success: false, message: 'A school with this email is already registered' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins validity

    const newSchool = await School.create({
      name: schoolName,
      address,
      email,
      phone,
      otpCode,
      otpExpires,
      isVerified: false,
    });

    // Send email with OTP
    const transporter = getTransporter();
    const mailOptions = {
      from: '"SMS Support" <no-reply@sms-portal.com>',
      to: email,
      subject: 'School Activation OTP Code',
      text: `Welcome to SMS. Use the following OTP code to verify and activate your school: ${otpCode}. It is valid for 15 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #FF6B35;">Welcome to SMS!</h2>
          <p>Thank you for registering <strong>${schoolName}</strong> on our platform.</p>
          <p>Please use the verification code below to verify your email and activate your account:</p>
          <div style="font-size: 24px; font-weight: bold; background: #FFF5F2; padding: 15px; border-radius: 5px; text-align: center; color: #FF6B35; letter-spacing: 5px; margin: 20px 0;">
            ${otpCode}
          </div>
          <p style="color: #777; font-size: 12px;">This code will expire in 15 minutes.</p>
        </div>
      `,
    };

    // Attempt to send email
    try {
      await transporter.sendMail(mailOptions);
      console.log(`OTP mail sent successfully to ${email}. Code: ${otpCode}`);
    } catch (mailErr) {
      console.warn(`Mail send failed, logging OTP to console: ${otpCode}. Error: ${mailErr.message}`);
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verification code sent. Please check your email.',
      schoolId: newSchool._id,
      // Dev mode shortcut
      otpCode: process.env.NODE_ENV !== 'production' ? otpCode : undefined
    });
  } catch (error) {
    console.error('School registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error registering school' });
  }
};

// @desc    Verify OTP and Create Admin Account
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
  const { schoolId, otpCode, adminName, adminEmail, adminPassword } = req.body;

  try {
    if (!schoolId || !otpCode || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields including admin details' });
    }

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School profile not found' });
    }

    if (school.isVerified) {
      return res.status(400).json({ success: false, message: 'This school has already been verified' });
    }

    // Check OTP
    if (school.otpCode !== otpCode || school.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
    }

    // Verify school
    school.isVerified = true;
    school.otpCode = undefined;
    school.otpExpires = undefined;
    await school.save();

    // Check if admin email already registered in system
    let existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'This email is already linked to a user account' });
    }

    // Create School Admin
    const adminUser = await User.create({
      schoolId: school._id,
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'Admin',
      phone: school.phone,
      isActive: true,
    });

    const token = generateToken(adminUser);

    return res.status(200).json({
      success: true,
      message: 'School verified and Admin account created successfully',
      token,
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        schoolId: adminUser.schoolId,
        schoolName: school.name
      },
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying OTP' });
  }
};

// @desc    User Login (All roles: SuperAdmin, Admin, Teacher, Student, Parent)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Validate account status
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account is deactivated' });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    let schoolName = null;
    // Validate associated school for non-SuperAdmins
    if (user.role !== 'SuperAdmin') {
      const school = await School.findById(user.schoolId);
      if (!school) {
        return res.status(404).json({ success: false, message: 'Associated school tenant not found' });
      }
      if (!school.isActive) {
        return res.status(403).json({ success: false, message: 'Your school tenant is suspended. Contact Support.' });
      }
      schoolName = school.name;
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        permissions: user.permissions,
        schoolName
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @desc    Get current user session profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const schoolObj = user && user.role !== 'SuperAdmin' ? await School.findById(user.schoolId) : null;
    return res.status(200).json({
      success: true,
      user: {
        ...user._doc,
        schoolName: schoolObj ? schoolObj.name : null
      },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving profile' });
  }
};
