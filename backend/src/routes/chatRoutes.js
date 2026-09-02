const express = require('express');
const router = express.Router();
const { getChatHistory, getChatContacts, sendChatMessage } = require('../controllers/chatController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/messages/:otherUserId', getChatHistory);
router.get('/history/:otherUserId', getChatHistory);
router.get('/contacts', getChatContacts);
router.post('/send', sendChatMessage);

module.exports = router;
