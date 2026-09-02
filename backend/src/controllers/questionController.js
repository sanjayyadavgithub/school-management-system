const Question = require('../models/Question');
const Class = require('../models/Class');
const Subject = require('../models/Subject');

// @desc    Create a subject-wise test/exam question
// @route   POST /api/questions
// @access  Private (Admin & Teacher)
exports.createQuestion = async (req, res) => {
  const {
    classId,
    subjectId,
    questionHindi,
    questionEnglish,
    option1,
    option2,
    option3,
    option4,
    answer,
    marks
  } = req.body;

  try {
    if (!classId || !subjectId || !questionHindi || !questionEnglish || !option1 || !option2 || !option3 || !option4 || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields including Class, Subject, Question (Hindi), Question (English), Option 1-4, and Answer'
      });
    }

    // Verify target class exists in school
    const classObj = await Class.findOne({ _id: classId, schoolId: req.schoolId });
    if (!classObj) {
      return res.status(404).json({ success: false, message: 'Class section not found' });
    }

    // Verify subject exists in school
    const subjectObj = await Subject.findOne({ _id: subjectId, schoolId: req.schoolId });
    if (!subjectObj) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const newQuestion = await Question.create({
      schoolId: req.schoolId,
      classId,
      subjectId,
      questionHindi,
      questionEnglish,
      option1,
      option2,
      option3,
      option4,
      answer,
      marks: parseInt(marks) || 1,
      createdBy: req.user ? req.user._id : undefined
    });

    const populated = await Question.findById(newQuestion._id)
      .populate('classId', 'name section')
      .populate('subjectId', 'name code');

    return res.status(201).json({
      success: true,
      message: 'Question added to subject question bank successfully',
      question: populated
    });
  } catch (error) {
    console.error('Create question error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating question' });
  }
};

// @desc    Get all subject-wise test questions (filtered by schoolId, classId, subjectId)
// @route   GET /api/questions
// @access  Private
exports.getQuestions = async (req, res) => {
  const { classId, subjectId } = req.query;

  try {
    const query = { schoolId: req.schoolId };
    if (classId) {
      query.classId = classId;
    }
    if (subjectId) {
      query.subjectId = subjectId;
    }

    const questions = await Question.find(query)
      .populate('classId', 'name section')
      .populate('subjectId', 'name code')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: questions.length, questions });
  } catch (error) {
    console.error('Get questions error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving questions' });
  }
};

// @desc    Delete a question
// @route   DELETE /api/questions/:id
// @access  Private (Admin & Teacher)
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findOneAndDelete({ _id: req.params.id, schoolId: req.schoolId });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    return res.status(200).json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting question' });
  }
};
