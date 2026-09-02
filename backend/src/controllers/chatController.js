const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const ParentProfile = require('../models/ParentProfile');

// @desc    Get chat messages history between two users
// @route   GET /api/chat/messages/:otherUserId
// @access  Private
exports.getChatHistory = async (req, res) => {
  const { otherUserId } = req.params;
  const myId = req.user._id;

  try {
    const messages = await ChatMessage.find({
      schoolId: req.schoolId,
      $or: [
        { senderId: myId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: myId }
      ]
    }).sort({ timestamp: 1 });

    return res.status(200).json({ success: true, count: messages.length, messages, history: messages });
  } catch (error) {
    console.error('Get chat history error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving chat history' });
  }
};

// @desc    Get eligible chat contacts based on role
// @route   GET /api/chat/contacts
// @access  Private
exports.getChatContacts = async (req, res) => {
  const myId = req.user._id;

  try {
    // Find all users belonging to the same school except the current user
    const contacts = await User.find({
      schoolId: req.schoolId,
      _id: { $ne: myId }
    }).select('name email role phone');

    return res.status(200).json({ success: true, count: contacts.length, contacts });
  } catch (error) {
    console.error('Get chat contacts error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching chat contacts' });
  }
};

// @desc    Send chat message REST fallback
// @route   POST /api/chat/send
// @access  Private
exports.sendChatMessage = async (req, res) => {
  const { receiverId, message } = req.body;

  try {
    if (!receiverId || !message) {
      return res.status(400).json({ success: false, message: 'Receiver and message are required' });
    }

    const senderId = req.user._id;
    let schoolId = req.schoolId || req.user.schoolId;
    if (!schoolId) {
      const School = require('../models/School');
      const firstSchool = await School.findOne();
      if (firstSchool) {
        schoolId = firstSchool._id;
      } else {
        return res.status(400).json({ success: false, message: 'No registered school tenant context available' });
      }
    }

    const chatMsg = await ChatMessage.create({
      schoolId,
      senderId,
      receiverId,
      message
    });

    return res.status(201).json({ success: true, chatMessage: chatMsg });
  } catch (error) {
    console.error('Send chat message error:', error);
    return res.status(500).json({ success: false, message: 'Server error sending message: ' + error.message });
  }
};
