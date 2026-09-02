const { generateResponse } = require('../services/ollamaService');
const User = require('../models/User');
const Class = require('../models/Class');
const FeePayment = require('../models/FeePayment');

// @desc    School Insights - natural language queries answered using real DB statistics
// @route   POST /api/ai/insights
// @access  Private
exports.getSchoolInsights = async (req, res) => {
  const { query } = req.body;

  try {
    if (!query) {
      return res.status(400).json({ success: false, message: 'Please provide a natural language query' });
    }

    // 1. Gather real-time school stats for context
    const studentCount = await User.countDocuments({ schoolId: req.schoolId, role: 'Student' });
    const teacherCount = await User.countDocuments({ schoolId: req.schoolId, role: 'Teacher' });
    const classCount = await Class.countDocuments({ schoolId: req.schoolId });

    // Fees collections aggregations
    const payments = await FeePayment.find({ schoolId: req.schoolId });
    const totalCollected = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const totalPending = payments.reduce((sum, p) => sum + p.pendingAmount, 0);

    const statsContext = `
      You are the SMS AI Assistant. You have access to the following current, verified statistics for this school tenant:
      - Total Students: ${studentCount}
      - Total Teachers: ${teacherCount}
      - Total Classes: ${classCount}
      - Total Fees Collected: ₹${totalCollected}
      - Total Fees Pending: ₹${totalPending}
      
      Instructions:
      - Answer the user's query accurately using ONLY the statistics provided above.
      - Support replies in both English and Hindi depending on the language of the query.
      - If the user asks for something outside of this data, explain politely that you can only answer questions related to student/teacher counts, classes, and fee collections.
    `;

    let reply = await generateResponse(query, statsContext);
    
    // Fallback if local Ollama is offline
    if (reply.includes('[Local Ollama Sandbox Fallback]')) {
      const q = query.toLowerCase();
      if (q.includes('teacher') || q.includes('faculty') || q.includes('staff')) {
        reply = `Based on the database metrics, there are currently ${teacherCount} active teachers in the school.`;
      } else if (q.includes('student') || q.includes('pupil') || q.includes('child')) {
        reply = `The school has a total of ${studentCount} students enrolled.`;
      } else if (q.includes('class') || q.includes('grade') || q.includes('section')) {
        reply = `There are ${classCount} classes mapped in the system.`;
      } else if (q.includes('collected') || q.includes('collection') || q.includes('received')) {
        reply = `The total fee collection stands at ₹${totalCollected}.`;
      } else if (q.includes('pending') || q.includes('outstanding') || q.includes('due') || q.includes('remaining')) {
        reply = `The total pending outstanding fee is ₹${totalPending}.`;
      } else {
        reply = `Hello! Based on the school database metrics: There are ${studentCount} students and ${teacherCount} teachers mapped across ${classCount} classes. The total fee collection stands at ₹${totalCollected} with ₹${totalPending} pending.`;
      }
    }

    return res.status(200).json({ success: true, response: reply });
  } catch (error) {
    console.error('AI Insights error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing AI query' });
  }
};

// @desc    Generate a Professional Fee Reminder Letter
// @route   POST /api/ai/fee-reminder
// @access  Private (Admin only)
exports.generateFeeReminder = async (req, res) => {
  const { parentName, studentName, className, feeType, amountDue, dueDate, tone } = req.body;

  try {
    if (!parentName || !studentName || amountDue === undefined || !tone) {
      return res.status(400).json({ success: false, message: 'Please provide parentName, studentName, amountDue, and tone' });
    }

    const prompt = `
      Generate a fee reminder letter with the following parameters:
      - Parent Name: ${parentName}
      - Student Name: ${studentName}
      - Class: ${className || 'N/A'}
      - Fee Type: ${feeType || 'Tuition Fee'}
      - Amount Due: ₹${amountDue}
      - Due Date: ${dueDate || 'Immediate'}
      - Tone: ${tone} (Options: Polite, Firm, Final Notice)
      
      Generate a complete email draft. Do not include markdown codeblocks or placeholder markers like [Insert Date] - generate complete text directly.
    `;

    const systemContext = "You are a professional school registrar. Draft a fee reminder letter strictly following the tone request.";
    let response = await generateResponse(prompt, systemContext);

    // Fallback if local Ollama is offline
    if (response.includes('[Local Ollama Sandbox Fallback]')) {
      response = `Subject: URGENT: Fee Payment Outstanding Reminder

Dear Parent of ${studentName},

We hope this email finds you well. This is a friendly reminder that there is a pending ${feeType || 'Tuition Fee'} payment of ₹${amountDue} for your child, ${studentName}, of Class ${className || '10th'}.

To ensure that educational resources remain continuously available, please clear this balance by the due date: ${dueDate || 'Immediate'}. 

Thank you for your prompt attention to this matter.

Sincerely,
School Administration
Sun Rise Public School`;
    }

    return res.status(200).json({ success: true, letter: response });
  } catch (error) {
    console.error('AI Fee Reminder error:', error);
    return res.status(500).json({ success: false, message: 'Server error generating fee reminder letter' });
  }
};

// @desc    Generate Report Card Comments
// @route   POST /api/ai/report-comment
// @access  Private (Admin or Teacher)
exports.generateReportComments = async (req, res) => {
  const { studentName, subjectName, marksObtained, maxMarks, behavior } = req.body;

  try {
    if (!studentName || marksObtained === undefined || maxMarks === undefined) {
      return res.status(400).json({ success: false, message: 'studentName, marksObtained, and maxMarks are required' });
    }

    const percentage = Math.round((marksObtained / maxMarks) * 100);

    const prompt = `
      Draft report card remarks for a student with the following details:
      - Student Name: ${studentName}
      - Subject: ${subjectName || 'Overall Academic Performance'}
      - Score: ${marksObtained} out of ${maxMarks} (${percentage}%)
      - Classroom Behavior/Participation: ${behavior || 'Good and active participant'}
      
      Generate a concise, constructive 2-3 sentence feedback paragraph.
    `;

    const systemContext = "You are an experienced class teacher. Write a constructive, encouraging comment highlighting strengths and offering mild tips for improvement.";
    let response = await generateResponse(prompt, systemContext);

    // Fallback if local Ollama is offline
    if (response.includes('[Local Ollama Sandbox Fallback]')) {
      response = `${studentName} has demonstrated great dedication in ${subjectName || 'Overall Academics'}, achieving a score of ${marksObtained}/${maxMarks} (${percentage}%). They are a ${behavior || 'polite and active participant'} in class. We encourage them to continue this excellent focus in the upcoming term to reach even greater heights.`;
    }

    return res.status(200).json({ success: true, comment: response });
  } catch (error) {
    console.error('AI Report Comments error:', error);
    return res.status(500).json({ success: false, message: 'Server error generating comments' });
  }
};

// @desc    Generate Event Plans / Schedules
// @route   POST /api/ai/event-planner
// @access  Private (Admin or Teacher)
exports.generateEventPlan = async (req, res) => {
  const { eventName, eventDate, targetAudience, durationHours, description } = req.body;

  try {
    if (!eventName || !targetAudience) {
      return res.status(400).json({ success: false, message: 'eventName and targetAudience are required' });
    }

    const prompt = `
      Create a detailed event execution plan and schedule for:
      - Event Name: ${eventName}
      - Date: ${eventDate || 'TBD'}
      - Target Audience: ${targetAudience} (e.g. Students, Parents, Teachers)
      - Duration: ${durationHours || 2} hours
      - Overview: ${description || 'Annual celebration'}
      
      Provide a breakdown timeline (e.g., Opening, Main events, Q&A/Closing) and a list of key items to prepare.
    `;

    const systemContext = "You are a professional school event planner. Generate a highly structured event outline with bullet points.";
    let response = await generateResponse(prompt, systemContext);

    // Fallback if local Ollama is offline
    if (response.includes('[Local Ollama Sandbox Fallback]')) {
      response = `📋 Event Plan for: ${eventName}
Target Audience: ${targetAudience}
Duration: ${durationHours || 2} Hours
Date: ${eventDate || 'TBD'}

TIMELINE OUTLINE:
- 00:00 - 00:15 (15 mins): Welcome Address and Opening Ceremony.
- 00:15 - 01:15 (60 mins): Main Event Programs, Presentations, and Keynote Addresses.
- 01:15 - 01:45 (30 mins): Open Q&A Session and Interactive Discussion.
- 01:45 - 02:00 (15 mins): Closing Remarks and Vote of Thanks.

PREPARATION CHECKLIST:
1. Arrange venue seating arrangements and audiovisual setup.
2. Confirm event schedule with speaker coordinators.
3. Transmit invitations to target audience: ${targetAudience}.`;
    }

    return res.status(200).json({ success: true, plan: response });
  } catch (error) {
    console.error('AI Event Planner error:', error);
    return res.status(500).json({ success: false, message: 'Server error planning event' });
  }
};

// @desc    Generate School Announcement Notices
// @route   POST /api/ai/notice-generator
// @access  Private (Admin only)
exports.generateNotice = async (req, res) => {
  const { title, details, priority } = req.body;

  try {
    if (!title || !details) {
      return res.status(400).json({ success: false, message: 'Notice title and details are required' });
    }

    const prompt = `
      Generate a official school circular/notice:
      - Title: ${title}
      - Core Announcement details: ${details}
      - Priority: ${priority || 'Medium'}
      
      Provide a formal notice draft containing Header, Body, and Closing placeholders.
    `;

    const systemContext = "You are a school principal writing a formal announcement circular.";
    let response = await generateResponse(prompt, systemContext);

    // Fallback if local Ollama is offline
    if (response.includes('[Local Ollama Sandbox Fallback]')) {
      response = `📢 OFFICIAL SCHOOL CIRCULAR
Reference: SRPS/2026/NOTICE-${priority || 'MEDIUM'}

Subject: ${title}

Dear Parents and Students,

Please find the important details regarding our upcoming update:
${details}

This circular is issued under the authority of the School Management. Please treat this notice with ${priority || 'Medium'} priority and align accordingly.

Best Regards,
Principal Office
Sun Rise Public School`;
    }

    return res.status(200).json({ success: true, notice: response });
  } catch (error) {
    console.error('AI Notice Generator error:', error);
    return res.status(500).json({ success: false, message: 'Server error generating notice' });
  }
};

// @desc    Generate Practice Quizzes by Subject/Topic
// @route   POST /api/ai/quiz-generator
// @access  Private
exports.generateQuiz = async (req, res) => {
  const { subject, topic, questionCount, gradeLevel } = req.body;

  try {
    if (!subject || !topic) {
      return res.status(400).json({ success: false, message: 'Subject and topic are required' });
    }

    const prompt = `
      Generate a practice quiz with these settings:
      - Subject: ${subject}
      - Topic: ${topic}
      - Number of Questions: ${questionCount || 3}
      - Target Grade Level: Class ${gradeLevel || '9'}
      
      For each question, provide:
      1. Question Text
      2. Multiple choice options (A, B, C, D)
      3. Correct Answer
      4. Explanation of the answer
    `;

    const systemContext = "You are an educational tutor. Generate a quiz containing questions, options, correct answers, and thorough explanations.";
    let response = await generateResponse(prompt, systemContext);

    // Fallback if local Ollama is offline
    if (response.includes('[Local Ollama Sandbox Fallback]')) {
      response = `📝 Practice Quiz: ${subject}
Topic: ${topic}
Grade Level: Class ${gradeLevel || '9'}
Total Questions: ${questionCount || 3}

Question 1: What is the primary concept behind ${topic}?
A) Static Acceleration
B) Dynamic Equilibrium
C) Fundamental Constants
D) None of the above
Correct Answer: B
Explanation: The core framework is defined by balance within the system.

Question 2: Which of the following is true for ${subject}?
A) Velocity increases exponentially
B) Conservation rules apply
C) Resistance becomes zero
D) All of the above
Correct Answer: B
Explanation: Conservation of mass/energy is a fundamental law in ${subject}.

Question 3: How is this topic applied in daily life?
A) Through structural engineering
B) Through astronomical observations
C) Both A and B
D) None of the above
Correct Answer: C
Explanation: The principles of ${topic} apply widely across structural design and space mechanics.`;
    }

    return res.status(200).json({ success: true, quiz: response });
  } catch (error) {
    console.error('AI Quiz Generator error:', error);
    return res.status(500).json({ success: false, message: 'Server error generating quiz' });
  }
};
