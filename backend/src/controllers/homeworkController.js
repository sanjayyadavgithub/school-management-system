const Homework = require('../models/Homework');
const Class = require('../models/Class');
const Subject = require('../models/Subject');

// @desc    Create a homework assignment
// @route   POST /api/homework
// @access  Private (Admin or Teacher with create_homework permission)
exports.createHomework = async (req, res) => {
  const { classId, subjectId, title, instructions, dueDate, maxMarks } = req.body;

  try {
    if (!classId || !subjectId || !title || !instructions || !dueDate || maxMarks === undefined) {
      return res.status(400).json({ success: false, message: 'classId, subjectId, title, instructions, dueDate, and maxMarks are required' });
    }

    // Verify class
    const classObj = await Class.findOne({ _id: classId, schoolId: req.schoolId });
    if (!classObj) {
      return res.status(404).json({ success: false, message: 'Class section not found' });
    }

    // Verify subject
    const subjectObj = await Subject.findOne({ _id: subjectId, schoolId: req.schoolId });
    if (!subjectObj) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const homework = await Homework.create({
      schoolId: req.schoolId,
      classId,
      subjectId,
      title,
      instructions,
      dueDate: new Date(dueDate),
      maxMarks,
      filePath: req.fileUrl || '',
      createdBy: req.user._id,
      submissions: [],
    });

    return res.status(201).json({ success: true, homework });
  } catch (error) {
    console.error('Create homework error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating homework' });
  }
};

// @desc    Get homework (filtered by classId)
// @route   GET /api/homework
// @access  Private
exports.getHomework = async (req, res) => {
  const { classId, subjectId } = req.query;

  try {
    const query = { schoolId: req.schoolId };
    if (classId) {
      query.classId = classId;
    }
    if (subjectId) {
      query.subjectId = subjectId;
    }

    const homeworkList = await Homework.find(query)
      .populate('classId', 'name section')
      .populate('subjectId', 'name code')
      .populate('createdBy', 'name')
      .sort({ dueDate: 1 });

    return res.status(200).json({ success: true, count: homeworkList.length, homework: homeworkList });
  } catch (error) {
    console.error('Get homework error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving homework' });
  }
};

// @desc    Submit homework answer
// @route   POST /api/homework/:id/submit
// @access  Private (Student only)
exports.submitHomework = async (req, res) => {
  const { answerText } = req.body;
  const homeworkId = req.params.id;
  const studentId = req.user._id;

  try {
    const homework = await Homework.findOne({ _id: homeworkId, schoolId: req.schoolId });
    if (!homework) {
      return res.status(404).json({ success: false, message: 'Homework assignment not found' });
    }

    // Check if student already submitted
    const alreadySubmitted = homework.submissions.some(sub => sub.studentId.toString() === studentId.toString());
    if (alreadySubmitted) {
      return res.status(400).json({ success: false, message: 'You have already submitted this assignment' });
    }

    homework.submissions.push({
      studentId,
      submissionDate: new Date(),
      answerText,
      fileUrl: req.fileUrl || '',
      status: 'Submitted'
    });

    await homework.save();

    return res.status(200).json({ success: true, message: 'Homework submitted successfully', homework });
  } catch (error) {
    console.error('Submit homework error:', error);
    return res.status(500).json({ success: false, message: 'Server error submitting homework' });
  }
};

// @desc    Grade a student's homework submission
// @route   PATCH /api/homework/:id/grade
// @access  Private (Admin or Teacher)
exports.gradeHomework = async (req, res) => {
  const { studentId, marksObtained, feedback } = req.body;
  const homeworkId = req.params.id;

  try {
    if (!studentId || marksObtained === undefined) {
      return res.status(400).json({ success: false, message: 'studentId and marksObtained are required' });
    }

    const homework = await Homework.findOne({ _id: homeworkId, schoolId: req.schoolId });
    if (!homework) {
      return res.status(404).json({ success: false, message: 'Homework assignment not found' });
    }

    // Locate the student's submission
    const submission = homework.submissions.find(sub => sub.studentId.toString() === studentId.toString());
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Student submission not found for this assignment' });
    }

    // Apply grades
    submission.marksObtained = marksObtained;
    submission.feedback = feedback || '';
    submission.status = 'Graded';

    await homework.save();

    return res.status(200).json({ success: true, message: 'Submission graded successfully', homework });
  } catch (error) {
    console.error('Grade homework error:', error);
    return res.status(500).json({ success: false, message: 'Server error grading homework' });
  }
};
