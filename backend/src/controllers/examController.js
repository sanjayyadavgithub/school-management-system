const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const StudentProfile = require('../models/StudentProfile');

// Calculate Grade based on percentage
const calculateGrade = (score, max) => {
  const percentage = (score / max) * 100;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  if (percentage >= 33) return 'E';
  return 'F';
};

// @desc    Create an exam/test profile with Question & Answer Key
// @route   POST /api/exams
// @access  Private (Admin & Teacher)
exports.createExam = async (req, res) => {
  const { name, classId, subjectId, examDate, maxMarks, passingMarks, questions } = req.body;

  try {
    if (!name || !classId || !subjectId || !examDate) {
      return res.status(400).json({ success: false, message: 'Title, class, subject, and test date are required' });
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

    // Format & validate questions if provided
    let formattedQuestions = [];
    if (Array.isArray(questions) && questions.length > 0) {
      formattedQuestions = questions.map(q => ({
        questionText: q.questionText || 'Untitled Question',
        type: q.type || 'ShortAnswer',
        options: Array.isArray(q.options) ? q.options.filter(opt => opt && opt.trim() !== '') : [],
        correctAnswer: q.correctAnswer || '',
        marks: parseInt(q.marks) || 5
      }));
    }

    const calculatedMaxMarks = formattedQuestions.length > 0
      ? formattedQuestions.reduce((sum, q) => sum + (parseInt(q.marks) || 0), 0)
      : (parseInt(maxMarks) || 100);

    const calculatedPassingMarks = parseInt(passingMarks) || Math.round(calculatedMaxMarks * 0.33);

    const exam = await Exam.create({
      schoolId: req.schoolId,
      name,
      classId,
      subjectId,
      examDate: new Date(examDate),
      maxMarks: calculatedMaxMarks,
      passingMarks: calculatedPassingMarks,
      questions: formattedQuestions,
      createdBy: req.user ? req.user._id : undefined
    });

    const populatedExam = await Exam.findById(exam._id)
      .populate('classId', 'name section')
      .populate('subjectId', 'name code');

    return res.status(201).json({ success: true, exam: populatedExam });
  } catch (error) {
    console.error('Create exam error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating exam' });
  }
};

// @desc    Get exams (optionally filtered by class)
// @route   GET /api/exams
// @access  Private
exports.getExams = async (req, res) => {
  const { classId } = req.query;

  try {
    const query = { schoolId: req.schoolId };
    if (classId) {
      query.classId = classId;
    }

    const exams = await Exam.find(query)
      .populate('classId', 'name section')
      .populate('subjectId', 'name code')
      .populate('createdBy', 'name role')
      .sort({ examDate: -1 });

    return res.status(200).json({ success: true, count: exams.length, exams });
  } catch (error) {
    console.error('Get exams error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving exams' });
  }
};

// @desc    Delete an exam/test
// @route   DELETE /api/exams/:id
// @access  Private (Admin & Teacher)
exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, schoolId: req.schoolId });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Test/Exam schedule not found' });
    }

    // Also delete associated results
    await ExamResult.deleteMany({ examId: req.params.id });

    return res.status(200).json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Delete exam error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting exam' });
  }
};

// @desc    Post or update marks for a student in an exam
// @route   POST /api/exams/:id/results
// @access  Private (Admin or Teacher with publish_exams permission)
exports.postExamResult = async (req, res) => {
  const { studentId, marksObtained, remarks } = req.body;
  const examId = req.params.id;

  try {
    if (!studentId || marksObtained === undefined) {
      return res.status(400).json({ success: false, message: 'studentId and marksObtained are required' });
    }

    const exam = await Exam.findOne({ _id: examId, schoolId: req.schoolId });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam profile not found' });
    }

    if (marksObtained > exam.maxMarks) {
      return res.status(400).json({ success: false, message: `Marks obtained cannot exceed max marks of ${exam.maxMarks}` });
    }

    const grade = calculateGrade(marksObtained, exam.maxMarks);

    let result = await ExamResult.findOne({ examId, studentId });
    if (result) {
      result.marksObtained = marksObtained;
      result.grade = grade;
      result.remarks = remarks || '';
      await result.save();
    } else {
      result = await ExamResult.create({
        schoolId: req.schoolId,
        examId,
        studentId,
        marksObtained,
        grade,
        remarks: remarks || '',
      });
    }

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Post exam result error:', error);
    return res.status(500).json({ success: false, message: 'Server error saving exam result' });
  }
};

// @desc    Get student report card details
// @route   GET /api/exams/results/student/:studentId
// @access  Private
exports.getStudentResults = async (req, res) => {
  const { studentId } = req.params;

  try {
    const student = await StudentProfile.findOne({ userId: studentId }).populate('classId');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const results = await ExamResult.find({ schoolId: req.schoolId, studentId })
      .populate({
        path: 'examId',
        populate: { path: 'subjectId', select: 'name code' }
      });

    return res.status(200).json({
      success: true,
      studentName: student.userId ? student.userId.name : 'Student',
      className: `${student.classId.name} ${student.classId.section}`,
      results,
    });
  } catch (error) {
    console.error('Get student results error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching results' });
  }
};
