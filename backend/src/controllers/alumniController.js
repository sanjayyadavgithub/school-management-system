const User = require('../models/User');
const AlumniJob = require('../models/AlumniJob');

// @desc    Get alumni directory (with filter and search)
// @route   GET /api/alumni/directory
// @access  Private
exports.getAlumniDirectory = async (req, res) => {
  const { search, graduationYear, industry } = req.query;
  try {
    const filter = {
      schoolId: req.schoolId,
      'alumniDetails.graduationYear': { $exists: true }
    };

    if (graduationYear) {
      filter['alumniDetails.graduationYear'] = parseInt(graduationYear);
    }

    if (industry) {
      filter['alumniDetails.industry'] = { $regex: industry, $options: 'i' };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'alumniDetails.currentCompany': { $regex: search, $options: 'i' } },
        { 'alumniDetails.currentPosition': { $regex: search, $options: 'i' } }
      ];
    }

    const alumni = await User.find(filter)
      .select('name email role alumniDetails')
      .sort({ 'alumniDetails.graduationYear': -1 });

    return res.status(200).json({ success: true, count: alumni.length, alumni });
  } catch (error) {
    console.error('Alumni directory error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching alumni directory' });
  }
};

// @desc    Update own alumni profile details
// @route   PUT /api/alumni/profile
// @access  Private
exports.updateAlumniProfile = async (req, res) => {
  const { graduationYear, currentCompany, currentPosition, industry, linkedinUrl } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Set or update alumni details (maintain verification flag or reset it for validation)
    const oldDetails = user.alumniDetails || {};
    user.alumniDetails = {
      graduationYear: graduationYear || oldDetails.graduationYear,
      currentCompany: currentCompany || oldDetails.currentCompany,
      currentPosition: currentPosition || oldDetails.currentPosition,
      industry: industry || oldDetails.industry,
      linkedinUrl: linkedinUrl || oldDetails.linkedinUrl,
      isVerified: oldDetails.isVerified || false // keep old status or false
    };

    await user.save();
    return res.status(200).json({ success: true, message: 'Alumni profile updated successfully', alumniDetails: user.alumniDetails });
  } catch (error) {
    console.error('Update alumni profile error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

// @desc    Verify alumni status
// @route   POST /api/alumni/:id/verify
// @access  Private (Admin)
exports.verifyAlumni = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!user || !user.alumniDetails || user.alumniDetails.graduationYear === undefined) {
      return res.status(404).json({ success: false, message: 'Alumni record not found' });
    }

    user.alumniDetails.isVerified = true;
    await user.save();

    return res.status(200).json({ success: true, message: 'Alumni status verified successfully', user });
  } catch (error) {
    console.error('Verify alumni error:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying alumni' });
  }
};

// @desc    Post a job opening
// @route   POST /api/alumni/jobs
// @access  Private (Verified Alumni / Admin / Staff)
exports.postJob = async (req, res) => {
  const { title, company, location, description, applyUrl } = req.body;
  try {
    if (!title || !company || !description) {
      return res.status(400).json({ success: false, message: 'Title, Company, and Description are required' });
    }

    // Check if user is verified alumnus or Admin/Teacher
    if (req.user.role !== 'Admin' && req.user.role !== 'Teacher') {
      if (!req.user.alumniDetails || !req.user.alumniDetails.isVerified) {
        return res.status(403).json({ success: false, message: 'Only verified alumni can post job openings' });
      }
    }

    const job = await AlumniJob.create({
      schoolId: req.schoolId,
      postedBy: req.user._id,
      title,
      company,
      location,
      description,
      applyUrl
    });

    return res.status(201).json({ success: true, job });
  } catch (error) {
    console.error('Post job error:', error);
    return res.status(500).json({ success: false, message: 'Server error posting job opening' });
  }
};

// @desc    Get job postings list
// @route   GET /api/alumni/jobs
// @access  Private
exports.getJobs = async (req, res) => {
  try {
    const jobs = await AlumniJob.find({ schoolId: req.schoolId })
      .populate('postedBy', 'name email role alumniDetails')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    console.error('Get jobs error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving job list' });
  }
};
