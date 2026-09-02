const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  requestLeave,
  getLeaves,
  reviewLeave,
  calculatePayroll,
  paySalary,
  downloadPayslip
} = require('../controllers/payrollController');

// All payroll/leave routes require authentication
router.use(protect);

// Leaves endpoints
router.post('/leave', requestLeave);
router.get('/leave', getLeaves);
router.post('/leave/:id/review', restrictTo('Admin'), reviewLeave);

// Payroll computation & pay endpoints
router.post('/calculate', restrictTo('Admin'), calculatePayroll);
router.post('/:id/pay', restrictTo('Admin'), paySalary);
router.get('/:id/payslip', downloadPayslip);

module.exports = router;
