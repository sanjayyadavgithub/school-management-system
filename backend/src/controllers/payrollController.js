const LeaveRequest = require('../models/LeaveRequest');
const Payroll = require('../models/Payroll');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// @desc    Submit leave request
// @route   POST /api/payroll/leave
// @access  Private (Staff)
exports.requestLeave = async (req, res) => {
  const { leaveType, startDate, endDate, reason } = req.body;
  try {
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const leave = await LeaveRequest.create({
      schoolId: req.schoolId,
      staffId: req.user._id,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason
    });

    return res.status(201).json({ success: true, leave });
  } catch (error) {
    console.error('Request leave error:', error);
    return res.status(500).json({ success: false, message: 'Server error requesting leave' });
  }
};

// @desc    Get leave requests
// @route   GET /api/payroll/leave
// @access  Private
exports.getLeaves = async (req, res) => {
  try {
    const filter = { schoolId: req.schoolId };
    if (req.user.role === 'Teacher') {
      filter.staffId = req.user._id;
    }
    const leaves = await LeaveRequest.find(filter)
      .populate('staffId', 'name email role')
      .populate('approvedBy', 'name');
    return res.status(200).json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    console.error('Get leaves error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving leaves' });
  }
};

// @desc    Review leave request (Approve/Reject)
// @route   POST /api/payroll/leave/:id/review
// @access  Private (Admin)
exports.reviewLeave = async (req, res) => {
  const { status, remarks } = req.body;
  try {
    if (!status || !['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status (Approved/Rejected) is required' });
    }

    const leave = await LeaveRequest.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    leave.status = status;
    leave.remarks = remarks || '';
    leave.approvedBy = req.user._id;
    await leave.save();

    return res.status(200).json({ success: true, message: `Leave request ${status.toLowerCase()} successfully`, leave });
  } catch (error) {
    console.error('Review leave error:', error);
    return res.status(500).json({ success: false, message: 'Server error reviewing leave' });
  }
};

// @desc    Calculate and generate monthly payroll for a staff member
// @route   POST /api/payroll/calculate
// @access  Private (Admin)
exports.calculatePayroll = async (req, res) => {
  const { staffId, month, year, basicSalary } = req.body;
  try {
    if (!staffId || !month || !year || !basicSalary) {
      return res.status(400).json({ success: false, message: 'staffId, month, year, and basicSalary are required' });
    }

    const staff = await User.findById(staffId);
    if (!staff || staff.schoolId.toString() !== req.schoolId.toString()) {
      return res.status(404).json({ success: false, message: 'Staff user not found in this school' });
    }

    // 1. Calculate Unapproved Leave Days (treated as LWP)
    // Find all attendance records in the month where the staff member is marked "Absent"
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Get all class attendance sheets in the school
    const attendanceSheets = await Attendance.find({
      schoolId: req.schoolId,
      date: { $gte: startDate, $lte: endDate }
    });

    let absentCount = 0;
    attendanceSheets.forEach(sheet => {
      sheet.records.forEach(record => {
        if (record.studentId.toString() === staffId.toString() && record.status === 'Absent') {
          absentCount++;
        }
      });
    });

    // Find approved leaves in the same timeframe
    const approvedLeaves = await LeaveRequest.find({
      schoolId: req.schoolId,
      staffId,
      status: 'Approved',
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    });

    let approvedLeaveDays = 0;
    approvedLeaves.forEach(leave => {
      const start = Math.max(leave.startDate, startDate);
      const end = Math.min(leave.endDate, endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      approvedLeaveDays += diffDays;
    });

    // LWP days = Absents not covered by approved paid leaves
    const lwpDays = Math.max(0, absentCount - approvedLeaveDays);
    const dayRate = basicSalary / 30;
    const lwpDeduction = Math.round(lwpDays * dayRate);

    // 2. Allowances & Standard Deductions
    const hra = Math.round(basicSalary * 0.20); // 20% House Rent Allowance
    const da = Math.round(basicSalary * 0.10);  // 10% Dearness Allowance
    const pf = Math.round(basicSalary * 0.12);  // 12% Provident Fund
    const tax = Math.round(basicSalary * 0.05); // 5% Professional Tax

    const netSalary = Math.max(0, basicSalary + hra + da - pf - tax - lwpDeduction);

    // Delete existing payroll for same month/year if not paid
    await Payroll.deleteMany({ schoolId: req.schoolId, staffId, month, year, status: 'Unpaid' });

    const payroll = await Payroll.create({
      schoolId: req.schoolId,
      staffId,
      month,
      year,
      basicSalary,
      allowances: { hra, da, special: 0 },
      deductions: { pf, tax, lwpDeduction },
      netSalary,
      status: 'Unpaid'
    });

    return res.status(201).json({
      success: true,
      message: 'Monthly payroll calculated successfully',
      payroll,
      breakdown: { absentCount, approvedLeaveDays, lwpDays }
    });
  } catch (error) {
    console.error('Calculate payroll error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error calculating payroll' });
  }
};

// @desc    Process salary payment
// @route   POST /api/payroll/:id/pay
// @access  Private (Admin)
exports.paySalary = async (req, res) => {
  try {
    const payroll = await Payroll.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    payroll.status = 'Paid';
    payroll.paymentDate = new Date();
    await payroll.save();

    return res.status(200).json({ success: true, message: 'Salary payout processed successfully', payroll });
  } catch (error) {
    console.error('Pay salary error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing payment' });
  }
};

// @desc    Get monthly payslip in HTML print layout (100% Free rendering)
// @route   GET /api/payroll/:id/payslip
// @access  Private (Staff or Admin)
exports.downloadPayslip = async (req, res) => {
  try {
    const payroll = await Payroll.findOne({ _id: req.params.id, schoolId: req.schoolId })
      .populate('staffId', 'name email role phone');

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    // Check permissions (users can only fetch their own payslip unless Admin)
    if (req.user.role !== 'Admin' && req.user._id.toString() !== payroll.staffId._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthStr = monthNames[payroll.month - 1];

    res.send(`
      <html>
        <head>
          <title>Payslip - ${payroll.staffId.name} - ${monthStr} ${payroll.year}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; background: #fff; }
            .payslip-box { max-width: 800px; margin: auto; border: 1px solid #eee; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.05); }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #2c3e50; }
            .title { font-size: 20px; text-transform: uppercase; letter-spacing: 1px; text-align: right; }
            .meta-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .meta-block h3 { margin-top: 0; font-size: 14px; text-transform: uppercase; color: #7f8c8d; }
            .meta-block p { margin: 5px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f8f9fa; border-bottom: 1px solid #ddd; text-align: left; padding: 10px; font-size: 14px; text-transform: uppercase; color: #7f8c8d; }
            td { padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 14px; }
            .total-row { font-weight: bold; background: #fcfcfc; border-top: 2px solid #ddd; }
            .net-section { text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #2c3e50; }
            .net-amount { font-size: 28px; font-weight: bold; color: #2c3e50; }
            .print-btn { display: block; width: fit-content; margin: 20px auto 0 auto; background: #2c3e50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; text-decoration: none; font-size: 14px; }
            @media print {
              .print-btn { display: none; }
              body { padding: 0; }
              .payslip-box { border: none; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="payslip-box">
            <div class="header">
              <div class="logo">SCHOOL MANAGEMENT SYSTEM</div>
              <div class="title">Salary Slip</div>
            </div>
            
            <div class="meta-section">
              <div class="meta-block">
                <h3>Employee Details</h3>
                <p><strong>Name:</strong> ${payroll.staffId.name}</p>
                <p><strong>Email:</strong> ${payroll.staffId.email}</p>
                <p><strong>Role:</strong> ${payroll.staffId.role}</p>
                <p><strong>Phone:</strong> ${payroll.staffId.phone || 'N/A'}</p>
              </div>
              <div class="meta-block" style="text-align: right;">
                <h3>Salary Period</h3>
                <p><strong>Month / Year:</strong> ${monthStr} ${payroll.year}</p>
                <p><strong>Status:</strong> <span style="color: ${payroll.status === 'Paid' ? '#27ae60' : '#c0392b'}; font-weight: bold;">${payroll.status}</span></p>
                <p><strong>Payment Date:</strong> ${payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString() : 'Pending'}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Earnings</th>
                  <th>Amount</th>
                  <th>Deductions</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Basic Salary</td>
                  <td>₹${payroll.basicSalary}</td>
                  <td>Provident Fund (PF)</td>
                  <td>₹${payroll.deductions.pf}</td>
                </tr>
                <tr>
                  <td>House Rent Allowance (HRA)</td>
                  <td>₹${payroll.allowances.hra}</td>
                  <td>Professional Tax</td>
                  <td>₹${payroll.deductions.tax}</td>
                </tr>
                <tr>
                  <td>Dearness Allowance (DA)</td>
                  <td>₹${payroll.allowances.da}</td>
                  <td>Leave Without Pay (LWP)</td>
                  <td>₹${payroll.deductions.lwpDeduction}</td>
                </tr>
                <tr class="total-row">
                  <td>Total Earnings</td>
                  <td>₹${payroll.basicSalary + payroll.allowances.hra + payroll.allowances.da}</td>
                  <td>Total Deductions</td>
                  <td>₹${payroll.deductions.pf + payroll.deductions.tax + payroll.deductions.lwpDeduction}</td>
                </tr>
              </tbody>
            </table>

            <div class="net-section">
              <div style="font-size: 14px; text-transform: uppercase; color: #7f8c8d;">Net Salary Payable</div>
              <div class="net-amount">₹${payroll.netSalary}</div>
            </div>
            
            <button class="print-btn" onclick="window.print()">Print Payslip</button>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Download payslip error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching payslip layout' });
  }
};
