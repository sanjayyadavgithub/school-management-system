const Assessment = require('../models/Assessment');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const StudentProfile = require('../models/StudentProfile');

// @desc    Create Assessment
// @route   POST /api/assessments
// @access  Private (Admin or Teacher)
exports.createAssessment = async (req, res) => {
  const { classId, subjectId, title, description, durationMinutes, questions, passPercentage, startTime, endTime } = req.body;
  try {
    if (!classId || !subjectId || !title || !questions || !Array.isArray(questions) || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'ClassId, SubjectId, Title, Questions array, startTime, and endTime are required' });
    }

    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    const assessment = await Assessment.create({
      schoolId: req.schoolId,
      classId,
      subjectId,
      title,
      description,
      durationMinutes,
      questions,
      totalMarks,
      passPercentage: passPercentage || 40,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      createdBy: req.user._id
    });

    return res.status(201).json({ success: true, assessment });
  } catch (error) {
    console.error('Create assessment error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating assessment' });
  }
};

// @desc    Get assessment list for student or teacher
// @route   GET /api/assessments
// @access  Private
exports.getAssessments = async (req, res) => {
  try {
    const filter = { schoolId: req.schoolId };

    if (req.user.role === 'Student') {
      const studentProfile = await StudentProfile.findOne({ userId: req.user._id });
      if (studentProfile) {
        filter.classId = studentProfile.classId;
      } else {
        return res.status(200).json({ success: true, count: 0, assessments: [] });
      }
    }

    const assessments = await Assessment.find(filter)
      .populate('subjectId', 'nameCode')
      .populate('createdBy', 'name')
      .sort({ startTime: 1 });

    return res.status(200).json({ success: true, count: assessments.length, assessments });
  } catch (error) {
    console.error('Get assessments error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving assessments' });
  }
};

// @desc    Submit student assessment answers & trigger auto-grading for MCQs/TrueFalse
// @route   POST /api/assessments/:id/submit
// @access  Private (Student)
exports.submitAssessment = async (req, res) => {
  const { id: assessmentId } = req.params;
  const { answers, cheatingLogs } = req.body; // answers: [{ questionId, selectedAnswer }]

  try {
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'Answers array is required' });
    }

    const assessment = await Assessment.findOne({ _id: assessmentId, schoolId: req.schoolId });
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    // Auto-grading matching logic
    let totalScore = 0;
    const gradedAnswers = answers.map(answer => {
      // Find matching question in database template
      const question = assessment.questions.id(answer.questionId);
      let marksObtained = 0;

      if (question) {
        // Auto grade MCQs and True/False questions exactly
        if (['MCQ', 'TrueFalse'].includes(question.type)) {
          const isCorrect = question.correctAnswer.trim().toLowerCase() === answer.selectedAnswer.trim().toLowerCase();
          marksObtained = isCorrect ? question.marks : 0;
        } else {
          // ShortAnswer requires teacher verification
          marksObtained = 0;
        }
      }

      totalScore += marksObtained;

      return {
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        marksObtained
      };
    });

    // Check if subjective/short-answers exist, if so we need final grading flag to be false
    const hasSubjective = assessment.questions.some(q => q.type === 'ShortAnswer');
    const isGraded = !hasSubjective;

    // Create or update assessment submission
    const submission = await AssessmentSubmission.create({
      assessmentId,
      studentId: req.user._id,
      answers: gradedAnswers,
      cheatingLogs: cheatingLogs || [],
      totalScore,
      isGraded,
      submittedAt: new Date()
    });

    return res.status(200).json({
      success: true,
      message: isGraded ? 'Assessment graded automatically' : 'Assessment submitted. Pending teacher subjective grading.',
      submission
    });
  } catch (error) {
    console.error('Submit assessment error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error saving submission' });
  }
};

// @desc    Log a proctoring violation (tab switch, etc.)
// @route   POST /api/assessments/:id/log-violation
// @access  Private (Student)
exports.logViolation = async (req, res) => {
  const { id: assessmentId } = req.params;
  const { eventType } = req.body; // e.g. 'TabSwitch', 'FullscreenExit'

  try {
    if (!eventType) {
      return res.status(400).json({ success: false, message: 'eventType is required' });
    }

    let submission = await AssessmentSubmission.findOne({
      assessmentId,
      studentId: req.user._id
    });

    if (!submission) {
      // If student hasn't submitted/initialized a session yet, we can create a temporary holder
      submission = await AssessmentSubmission.create({
        assessmentId,
        studentId: req.user._id,
        answers: [],
        cheatingLogs: [],
        totalScore: 0,
        isGraded: false
      });
    }

    submission.cheatingLogs.push({
      eventType,
      timestamp: new Date()
    });

    await submission.save();

    return res.status(200).json({ success: true, message: 'Violation logged', submission });
  } catch (error) {
    console.error('Log violation error:', error);
    return res.status(500).json({ success: false, message: 'Server error logging violation' });
  }
};
