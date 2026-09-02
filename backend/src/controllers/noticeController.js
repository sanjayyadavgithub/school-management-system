const Notice = require('../models/Notice');

// @desc    Create a notice/announcement
// @route   POST /api/notices
// @access  Private (Admin only)
exports.createNotice = async (req, res) => {
  const { title, content, priority, targetRoles } = req.body;

  try {
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Notice title and content are required' });
    }

    const notice = await Notice.create({
      schoolId: req.schoolId,
      title,
      content,
      priority: priority || 'Medium',
      authorName: req.user.name,
      targetRoles: targetRoles || ['Teacher', 'Student', 'Parent'],
    });

    return res.status(201).json({ success: true, notice });
  } catch (error) {
    console.error('Create notice error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating notice' });
  }
};

// @desc    Get notices targeted to current user role
// @route   GET /api/notices
// @access  Private
exports.getNotices = async (req, res) => {
  try {
    // Filter notices targeted to user role
    const query = {
      schoolId: req.schoolId,
    };

    // Non-Admins only see notices explicitly targeting their roles
    if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
      query.targetRoles = req.user.role;
    }

    const notices = await Notice.find(query).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: notices.length, notices });
  } catch (error) {
    console.error('Get notices error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving notices' });
  }
};

// @desc    Delete notice
// @route   DELETE /api/notices/:id
// @access  Private (Admin only)
exports.deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    await Notice.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Delete notice error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting notice' });
  }
};
