const School = require('../models/School');
const User = require('../models/User');

// @desc    Get all registered schools (tenants)
// @route   GET /api/superadmin/schools
// @access  Private (SuperAdmin only)
exports.getSchools = async (req, res) => {
  try {
    const schools = await School.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: schools.length, schools });
  } catch (error) {
    console.error('SuperAdmin get schools error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving schools' });
  }
};

// @desc    Toggle school active status (enable/disable tenant)
// @route   PATCH /api/superadmin/schools/:id/toggle
// @access  Private (SuperAdmin only)
exports.toggleSchoolStatus = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School tenant not found' });
    }

    school.isActive = !school.isActive;
    await school.save();

    // If deactivated, we can optionally toggle associated user sessions
    // For simplicity, auth middleware checks school.isActive dynamically on each protect hook

    return res.status(200).json({
      success: true,
      message: `School tenant ${school.name} has been ${school.isActive ? 'activated' : 'suspended'}`,
      school,
    });
  } catch (error) {
    console.error('SuperAdmin toggle school error:', error);
    return res.status(500).json({ success: false, message: 'Server error toggling school status' });
  }
};

// @desc    Get global SaaS network metrics
// @route   GET /api/superadmin/metrics
// @access  Private (SuperAdmin only)
exports.getAppMetrics = async (req, res) => {
  try {
    const totalSchools = await School.countDocuments();
    const verifiedSchools = await School.countDocuments({ isVerified: true });
    const activeSchools = await School.countDocuments({ isActive: true, isVerified: true });
    const totalUsers = await User.countDocuments();

    // Break down users by role
    const adminCount = await User.countDocuments({ role: 'Admin' });
    const teacherCount = await User.countDocuments({ role: 'Teacher' });
    const studentCount = await User.countDocuments({ role: 'Student' });
    const parentCount = await User.countDocuments({ role: 'Parent' });

    return res.status(200).json({
      success: true,
      metrics: {
        schools: {
          total: totalSchools,
          verified: verifiedSchools,
          active: activeSchools,
        },
        users: {
          total: totalUsers,
          admins: adminCount,
          teachers: teacherCount,
          students: studentCount,
          parents: parentCount,
        }
      }
    });
  } catch (error) {
    console.error('SuperAdmin metrics error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving metrics' });
  }
};
