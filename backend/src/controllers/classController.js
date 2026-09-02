const Class = require('../models/Class');
const Subject = require('../models/Subject');

// @desc    Create a new class section
// @route   POST /api/classes
// @access  Private (Admin only)
exports.createClass = async (req, res) => {
  const { name, section, roomNumber } = req.body;

  try {
    if (!name || !section) {
      return res.status(400).json({ success: false, message: 'Class name and section are required' });
    }

    // Check duplicate class-section in the tenant school
    const existingClass = await Class.findOne({ schoolId: req.schoolId, name, section });
    if (existingClass) {
      return res.status(400).json({ success: false, message: `Class ${name} Section ${section} already exists` });
    }

    const newClass = await Class.create({
      schoolId: req.schoolId,
      name,
      section,
      roomNumber,
      subjects: [],
    });

    return res.status(201).json({ success: true, class: newClass });
  } catch (error) {
    console.error('Create class error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating class' });
  }
};

// @desc    Get all classes in school
// @route   GET /api/classes
// @access  Private (All authenticated users in tenant)
exports.getClasses = async (req, res) => {
  try {
    const classes = await Class.find({ schoolId: req.schoolId })
      .populate('subjects')
      .sort({ name: 1, section: 1 });

    return res.status(200).json({ success: true, count: classes.length, classes });
  } catch (error) {
    console.error('Get classes error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving classes' });
  }
};

// @desc    Update class section details
// @route   PUT /api/classes/:id
// @access  Private (Admin only)
exports.updateClass = async (req, res) => {
  const { name, section, roomNumber } = req.body;

  try {
    let classObj = await Class.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!classObj) {
      return res.status(404).json({ success: false, message: 'Class section not found' });
    }

    // Check unique conflict if name or section is changing
    if (name !== classObj.name || section !== classObj.section) {
      const duplicate = await Class.findOne({
        schoolId: req.schoolId,
        name: name || classObj.name,
        section: section || classObj.section,
        _id: { $ne: req.params.id }
      });
      if (duplicate) {
        return res.status(400).json({ success: false, message: 'Another class with this name and section already exists' });
      }
    }

    classObj.name = name || classObj.name;
    classObj.section = section || classObj.section;
    classObj.roomNumber = roomNumber !== undefined ? roomNumber : classObj.roomNumber;
    await classObj.save();

    return res.status(200).json({ success: true, class: classObj });
  } catch (error) {
    console.error('Update class error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating class' });
  }
};

// @desc    Delete a class section
// @route   DELETE /api/classes/:id
// @access  Private (Admin only)
exports.deleteClass = async (req, res) => {
  try {
    const classObj = await Class.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!classObj) {
      return res.status(404).json({ success: false, message: 'Class section not found' });
    }

    // Remove the class
    await Class.findByIdAndDelete(req.params.id);

    // Also remove associated subjects
    await Subject.deleteMany({ classId: req.params.id, schoolId: req.schoolId });

    return res.status(200).json({ success: true, message: 'Class and associated subjects deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting class' });
  }
};
