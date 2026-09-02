const express = require('express');
const router = express.Router();
const { getSchools, toggleSchoolStatus, getAppMetrics } = require('../controllers/superAdminController');
const { protect, restrictTo } = require('../middlewares/auth');

// Secure all routes inside this namespace to SuperAdmin
router.use(protect);
router.use(restrictTo('SuperAdmin'));

router.get('/schools', getSchools);
router.patch('/schools/:id/toggle', toggleSchoolStatus);
router.get('/metrics', getAppMetrics);

module.exports = router;
