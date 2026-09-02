const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const { triggerBackup, getAuditLogs } = require('../controllers/backupController');

router.use(protect);
router.use(restrictTo('Admin'));

router.post('/backup', triggerBackup);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
