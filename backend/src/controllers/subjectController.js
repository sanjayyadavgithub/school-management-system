const Subject = require('../models/Subject');
const Class = require('../models/Class');

// @desc    Create a new subject inside a class section
// @route   POST /api/subjects
// @access  Private (Admin only)
exports.createSubject = async (req, res) => {
  const { name, code, classId } = req.body;

  try {
    if (!name || !code || !classId) {
      return res.status(400).json({ success: false, message: 'Subject name, code, and classId are required' });
    }

    // Verify class exists in school
    const classObj = await Class.findOne({ _id: classId, schoolId: req.schoolId });
    if (!classObj) {
      return res.status(404).json({ success: false, message: 'Target class section not found' });
    }

    // Check duplicate code in school
    const existingSubject = await Subject.findOne({ schoolId: req.schoolId, code });
    if (existingSubject) {
      return res.status(400).json({ success: false, message: `Subject with code ${code} already exists` });
    }

    const newSubject = await Subject.create({
      schoolId: req.schoolId,
      name,
      code,
      classId,
    });

    // Append to class's subject list
    classObj.subjects.push(newSubject._id);
    await classObj.save();

    return res.status(201).json({ success: true, subject: newSubject });
  } catch (error) {
    console.error('Create subject error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating subject' });
  }
};

// @desc    Get all subjects (optionally filtered by classId)
// @route   GET /api/subjects
// @access  Private (All authenticated users in tenant)
exports.getSubjects = async (req, res) => {
  const { classId } = req.query;

  try {
    const query = { schoolId: req.schoolId };
    if (classId) {
      query.classId = classId;
    }

    const subjects = await Subject.find(query).populate('classId', 'name section').sort({ name: 1 });
    return res.status(200).json({ success: true, count: subjects.length, subjects });
  } catch (error) {
    console.error('Get subjects error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving subjects' });
  }
};

// @desc    Update a subject
// @route   PUT /api/subjects/:id
// @access  Private (Admin only)
exports.updateSubject = async (req, res) => {
  const { name, code, classId } = req.body;

  try {
    const subject = await Subject.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // Check code duplication if code is changed
    if (code && code !== subject.code) {
      const existing = await Subject.findOne({ schoolId: req.schoolId, code, _id: { $ne: subject._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: `Subject code ${code} is already in use` });
      }
      subject.code = code;
    }

    if (name) subject.name = name;

    // Handle class reassignment if classId changed
    if (classId && classId.toString() !== (subject.classId._id || subject.classId).toString()) {
      const newClass = await Class.findOne({ _id: classId, schoolId: req.schoolId });
      if (!newClass) {
        return res.status(404).json({ success: false, message: 'Target class level not found' });
      }

      // Pull from old class
      await Class.updateOne(
        { _id: subject.classId, schoolId: req.schoolId },
        { $pull: { subjects: subject._id } }
      );

      // Push to new class
      newClass.subjects.push(subject._id);
      await newClass.save();

      subject.classId = classId;
    }

    await subject.save();
    const updatedSubject = await Subject.findById(subject._id).populate('classId', 'name section');

    return res.status(200).json({ success: true, message: 'Subject updated successfully', subject: updatedSubject });
  } catch (error) {
    console.error('Update subject error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating subject' });
  }
};

// @desc    Delete a subject
// @route   DELETE /api/subjects/:id
// @access  Private (Admin only)
exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // Remove reference from parent class
    await Class.updateOne(
      { _id: subject.classId, schoolId: req.schoolId },
      { $pull: { subjects: subject._id } }
    );

    // Delete subject
    await Subject.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting subject' });
  }
};
