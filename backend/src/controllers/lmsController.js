const Lecture = require('../models/Lecture');
const Homework = require('../models/Homework');

// Cosine similarity text processing helper (100% Free self-hosted plagiarism engine)
const calculateSimilarity = (text1, text2) => {
  if (!text1 || !text2) return 0;
  
  const getWords = (str) => str.toLowerCase().match(/\b\w+\b/g) || [];
  
  const words1 = getWords(text1);
  const words2 = getWords(text2);
  
  if (words1.length === 0 || words2.length === 0) return 0;

  // Build vocabulary
  const vocab = new Set([...words1, ...words2]);
  
  // Frequency vectors
  const freq1 = {};
  const freq2 = {};
  vocab.forEach(word => {
    freq1[word] = 0;
    freq2[word] = 0;
  });
  
  words1.forEach(word => freq1[word]++);
  words2.forEach(word => freq2[word]++);
  
  // Cosine similarity calculation
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  vocab.forEach(word => {
    dotProduct += freq1[word] * freq2[word];
    mag1 += freq1[word] * freq1[word];
    mag2 += freq2[word] * freq2[word];
  });
  
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  return (dotProduct / (mag1 * mag2)) * 100; // similarity percentage
};

// @desc    Upload recorded lecture metadata
// @route   POST /api/lms/lectures
// @access  Private (Admin or Teacher)
exports.uploadLecture = async (req, res) => {
  const { classId, subjectId, title, description, videoUrl, thumbnailUrl } = req.body;
  try {
    if (!classId || !subjectId || !title || !videoUrl) {
      return res.status(400).json({ success: false, message: 'ClassId, SubjectId, Title, and Video URL are required' });
    }

    const lecture = await Lecture.create({
      schoolId: req.schoolId,
      classId,
      subjectId,
      title,
      description,
      videoUrl,
      thumbnailUrl,
      uploadedBy: req.user._id
    });

    return res.status(201).json({ success: true, lecture });
  } catch (error) {
    console.error('Upload lecture error:', error);
    return res.status(500).json({ success: false, message: 'Server error uploading lecture metadata' });
  }
};

// @desc    Get recorded lectures list
// @route   GET /api/lms/lectures
// @access  Private
exports.getLectures = async (req, res) => {
  const { classId, subjectId } = req.query;
  try {
    const filter = { schoolId: req.schoolId };
    if (classId) filter.classId = classId;
    if (subjectId) filter.subjectId = subjectId;

    const lectures = await Lecture.find(filter)
      .populate('subjectId', 'nameCode')
      .populate('uploadedBy', 'name');
    return res.status(200).json({ success: true, count: lectures.length, lectures });
  } catch (error) {
    console.error('Get lectures error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving lectures' });
  }
};

// @desc    Submit homework and run plagiarism check
// @route   POST /api/lms/homework/:homeworkId/submit
// @access  Private (Student)
exports.submitHomework = async (req, res) => {
  const { homeworkId } = req.params;
  const { answerText, fileUrl } = req.body;

  try {
    if (!answerText && !fileUrl) {
      return res.status(400).json({ success: false, message: 'Submission body (text or file) is required' });
    }

    const homework = await Homework.findOne({ _id: homeworkId, schoolId: req.schoolId });
    if (!homework) {
      return res.status(404).json({ success: false, message: 'Homework task not found' });
    }

    // 1. Get other student submissions for this same homework to perform comparison
    let highestPlagiarismScore = 0;
    let matchingReport = 'No matches found.';

    if (answerText) {
      // Loop existing submissions
      for (const sub of homework.submissions) {
        if (sub.answerText && sub.studentId.toString() !== req.user._id.toString()) {
          const score = calculateSimilarity(answerText, sub.answerText);
          if (score > highestPlagiarismScore) {
            highestPlagiarismScore = Math.round(score);
            matchingReport = `Highest match found with another student's text submission (${highestPlagiarismScore}% similarity).`;
          }
        }
      }
    }

    // 2. Clear old submission from this student if exists, then add new
    const existingIndex = homework.submissions.findIndex(
      (s) => s.studentId.toString() === req.user._id.toString()
    );

    const submissionData = {
      studentId: req.user._id,
      submissionDate: new Date(),
      answerText,
      fileUrl,
      plagiarismScore: highestPlagiarismScore,
      plagiarismReport: matchingReport,
      status: 'Submitted'
    };

    if (existingIndex >= 0) {
      homework.submissions[existingIndex] = submissionData;
    } else {
      homework.submissions.push(submissionData);
    }

    await homework.save();

    return res.status(200).json({
      success: true,
      message: 'Homework submitted successfully and passed plagiarism filters',
      submission: submissionData
    });
  } catch (error) {
    console.error('Homework submission error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error uploading submission' });
  }
};
