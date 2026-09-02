const AuditLog = require('../models/AuditLog');
const { runBackup } = require('../services/backupService');
const path = require('path');

// @desc    Trigger and Download database backup
// @route   POST /api/compliance/backup
// @access  Private (Admin)
exports.triggerBackup = async (req, res) => {
  try {
    // Audit log the action
    await AuditLog.create({
      schoolId: req.schoolId,
      userId: req.user._id,
      action: 'TRIGGER_DATABASE_BACKUP',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      details: { trigger: 'Manual Admin Action' }
    });

    // Run the backup for this tenant school
    const result = await runBackup(req.schoolId);

    return res.status(200).json({
      success: true,
      message: 'Encrypted backup archive generated successfully',
      filename: result.filename,
      filePath: result.filePath
    });
  } catch (error) {
    console.error('Trigger backup controller error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error generating backup archive' });
  }
};

// @desc    Get Compliance Audit Logs
// @route   GET /api/compliance/audit-logs
// @access  Private (Admin)
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({ schoolId: req.schoolId })
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 });

    return res.status(200).json({ success: true, count: logs.length, logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving compliance logs' });
  }
};

// Helper middleware to log events directly from routes
exports.auditEventLogger = (actionName) => {
  return async (req, res, next) => {
    try {
      if (req.user) {
        await AuditLog.create({
          schoolId: req.schoolId,
          userId: req.user._id,
          action: actionName,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          details: {
            method: req.method,
            path: req.originalUrl,
            body: req.method !== 'GET' ? req.body : undefined
          }
        });
      }
    } catch (e) {
      console.error('Audit event log failure:', e.message);
    }
    next();
  };
};
