const StudyMaterial = require('../models/StudyMaterial');
const Class = require('../models/Class');
const Subject = require('../models/Subject');

// @desc    Upload study material
// @route   POST /api/materials
// @access  Private (Admin or Teacher)
exports.uploadMaterial = async (req, res) => {
  const { title, description, classId, subjectId } = req.body;

  try {
    if (!title || !classId || !subjectId) {
      return res.status(400).json({ success: false, message: 'Title, classId, and subjectId are required' });
    }

    if (!req.fileUrl) {
      return res.status(400).json({ success: false, message: 'Please upload a reference document file' });
    }

    // Verify class exists
    const classObj = await Class.findOne({ _id: classId, schoolId: req.schoolId });
    if (!classObj) {
      return res.status(404).json({ success: false, message: 'Class section not found' });
    }

    // Verify subject exists
    const subjectObj = await Subject.findOne({ _id: subjectId, schoolId: req.schoolId });
    if (!subjectObj) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const material = await StudyMaterial.create({
      schoolId: req.schoolId,
      title,
      description,
      fileUrl: req.fileUrl,
      classId,
      subjectId,
      uploadedBy: req.user._id,
    });

    return res.status(201).json({ success: true, material });
  } catch (error) {
    console.error('Upload material error:', error);
    return res.status(500).json({ success: false, message: 'Server error uploading study material' });
  }
};

// @desc    Get study materials in school (filtered by class/subject)
// @route   GET /api/materials
// @access  Private
exports.getMaterials = async (req, res) => {
  const { classId, subjectId } = req.query;

  try {
    const query = { schoolId: req.schoolId };
    if (classId) {
      query.classId = classId;
    }
    if (subjectId) {
      query.subjectId = subjectId;
    }

    const materials = await StudyMaterial.find(query)
      .populate('classId', 'name section')
      .populate('subjectId', 'name code')
      .populate('uploadedBy', 'name role')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: materials.length, materials });
  } catch (error) {
    console.error('Get materials error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving materials' });
  }
};

// @desc    Delete study material
// @route   DELETE /api/materials/:id
// @access  Private (Admin or Teacher who uploaded it)
exports.deleteMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!material) {
      return res.status(404).json({ success: false, message: 'Study material not found' });
    }

    // Only allow Admin or the Teacher who uploaded it to delete
    if (req.user.role !== 'Admin' && material.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this material file' });
    }

    await StudyMaterial.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, message: 'Study material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting material' });
  }
};
