const FeeStructure = require('../models/FeeStructure');
const FeePayment = require('../models/FeePayment');
const Concession = require('../models/Concession');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');

// @desc    Create a new fee structure for a class
// @route   POST /api/fees/structures
// @access  Private (Admin only)
exports.createFeeStructure = async (req, res) => {
  const { classId, feeType, amount, frequency } = req.body;

  try {
    if (!classId || !feeType || amount === undefined || !frequency) {
      return res.status(400).json({ success: false, message: 'classId, feeType, amount, and frequency are required' });
    }

    const structure = await FeeStructure.create({
      schoolId: req.schoolId,
      classId,
      feeType,
      amount,
      frequency,
    });

    return res.status(201).json({ success: true, structure });
  } catch (error) {
    console.error('Create fee structure error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating fee structure' });
  }
};

// @desc    Get all fee structures (optionally filtered by class)
// @route   GET /api/fees/structures
// @access  Private
exports.getFeeStructures = async (req, res) => {
  const { classId } = req.query;

  try {
    const query = { schoolId: req.schoolId };
    if (classId) {
      query.classId = classId;
    }

    const structures = await FeeStructure.find(query).populate('classId');
    return res.status(200).json({ success: true, count: structures.length, structures });
  } catch (error) {
    console.error('Get fee structures error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving fee structures' });
  }
};

// @desc    Add or update a concession for a student
// @route   POST /api/fees/concessions
// @access  Private (Admin only)
exports.addConcession = async (req, res) => {
  const { studentId, concessionType, valueType, value } = req.body;

  try {
    if (!studentId || !concessionType || !valueType || value === undefined) {
      return res.status(400).json({ success: false, message: 'studentId, concessionType, valueType, and value are required' });
    }

    let concession = await Concession.findOne({ schoolId: req.schoolId, studentId });
    if (concession) {
      concession.concessionType = concessionType;
      concession.valueType = valueType;
      concession.value = value;
      await concession.save();
    } else {
      concession = await Concession.create({
        schoolId: req.schoolId,
        studentId,
        concessionType,
        valueType,
        value,
      });
    }

    return res.status(200).json({ success: true, concession });
  } catch (error) {
    console.error('Add concession error:', error);
    return res.status(500).json({ success: false, message: 'Server error adding concession' });
  }
};

// @desc    Record a fee payment (collect fee)
// @route   POST /api/fees/collect
// @access  Private (Admin only)
exports.collectFee = async (req, res) => {
  const { studentId, feeStructureId, amountPaid, paymentMode } = req.body;

  try {
    if (!studentId || !feeStructureId || amountPaid === undefined || !paymentMode) {
      return res.status(400).json({ success: false, message: 'studentId, feeStructureId, amountPaid, and paymentMode are required' });
    }

    // 1. Get Fee Structure
    const feeStructure = await FeeStructure.findById(feeStructureId);
    if (!feeStructure) {
      return res.status(404).json({ success: false, message: 'Fee structure not found' });
    }

    // 2. Check for Student Concession
    const concession = await Concession.findOne({ studentId });
    let originalAmount = feeStructure.amount;
    let finalTargetAmount = originalAmount;

    if (concession) {
      if (concession.valueType === 'Percentage') {
        finalTargetAmount = originalAmount - (originalAmount * (concession.value / 100));
      } else { // Flat
        finalTargetAmount = Math.max(0, originalAmount - concession.value);
      }
    }

    // 3. Find if there are already payments for this structure
    const previousPayments = await FeePayment.find({ studentId, feeStructureId });
    const totalPreviouslyPaid = previousPayments.reduce((sum, pay) => sum + pay.amountPaid, 0);

    const pendingAmountBeforeThis = finalTargetAmount - totalPreviouslyPaid;
    const pendingAmountAfterThis = Math.max(0, pendingAmountBeforeThis - amountPaid);

    // 4. Generate unique invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let status = 'Pending';
    if (pendingAmountAfterThis === 0) {
      status = 'Paid';
    } else if (amountPaid > 0) {
      status = 'Partial';
    }

    const feePayment = await FeePayment.create({
      schoolId: req.schoolId,
      studentId,
      feeStructureId,
      amountPaid,
      pendingAmount: pendingAmountAfterThis,
      paymentMode,
      invoiceNumber,
      status,
      paymentDate: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      receipt: {
        invoiceNumber,
        originalAmount,
        discountApplied: originalAmount - finalTargetAmount,
        finalTargetAmount,
        amountPaid,
        pendingAmount: pendingAmountAfterThis,
        status,
        paymentMode,
        paymentDate: feePayment.paymentDate
      }
    });
  } catch (error) {
    console.error('Collect fee error:', error);
    return res.status(500).json({ success: false, message: 'Server error collecting fees' });
  }
};

// @desc    Get detailed fee status/ledger for a student
// @route   GET /api/fees/student/:studentId
// @access  Private
exports.getStudentFeeLedger = async (req, res) => {
  const { studentId } = req.params;

  try {
    const studentProfile = await StudentProfile.findOne({ userId: studentId }).populate('classId');
    if (!studentProfile) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    // Fetch fee structures applicable to student's class
    const classStructures = await FeeStructure.find({
      schoolId: req.schoolId,
      classId: studentProfile.classId._id
    });

    // Fetch concessions
    const concession = await Concession.findOne({ studentId });

    // Fetch payment records
    const payments = await FeePayment.find({ studentId }).populate('feeStructureId');

    // Compile dynamic ledger
    const ledger = classStructures.map(structure => {
      const structurePayments = payments.filter(p => p.feeStructureId && p.feeStructureId._id.toString() === structure._id.toString());
      const totalPaid = structurePayments.reduce((sum, p) => sum + p.amountPaid, 0);

      // Apply concession
      let originalAmount = structure.amount;
      let finalTargetAmount = originalAmount;
      if (concession) {
        if (concession.valueType === 'Percentage') {
          finalTargetAmount = originalAmount - (originalAmount * (concession.value / 100));
        } else {
          finalTargetAmount = Math.max(0, originalAmount - concession.value);
        }
      }

      const balance = Math.max(0, finalTargetAmount - totalPaid);
      let status = 'Pending';
      if (balance === 0) status = 'Paid';
      else if (totalPaid > 0) status = 'Partial';

      return {
        feeStructureId: structure._id,
        feeType: structure.feeType,
        frequency: structure.frequency,
        originalAmount,
        concessionApplied: originalAmount - finalTargetAmount,
        finalTargetAmount,
        totalPaid,
        balance,
        status,
        payments: structurePayments
      };
    });

    return res.status(200).json({
      success: true,
      student: studentProfile.userId,
      className: `${studentProfile.classId.name} ${studentProfile.classId.section}`,
      concession: concession || null,
      ledger
    });
  } catch (error) {
    console.error('Get student fee ledger error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving fee ledger' });
  }
};

// @desc    Get fee reports (Monthly totals & Class-wise)
// @route   GET /api/fees/report
// @access  Private (Admin only)
exports.getFeeReport = async (req, res) => {
  try {
    const payments = await FeePayment.find({ schoolId: req.schoolId })
      .populate('studentId', 'name')
      .populate({ path: 'feeStructureId', populate: { path: 'classId', select: 'name section' } });

    // Aggregate monthly totals (last 6 months)
    const monthlySummary = {};
    const classSummary = {};

    payments.forEach(pay => {
      const date = new Date(pay.paymentDate);
      const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' }); // e.g. "Jul 2026"
      monthlySummary[monthYear] = (monthlySummary[monthYear] || 0) + pay.amountPaid;

      // Class summary
      if (pay.feeStructureId && pay.feeStructureId.classId) {
        const className = `${pay.feeStructureId.classId.name} ${pay.feeStructureId.classId.section}`;
        classSummary[className] = (classSummary[className] || 0) + pay.amountPaid;
      }
    });

    return res.status(200).json({
      success: true,
      report: {
        monthlyTrend: Object.keys(monthlySummary).map(key => ({ month: key, amount: monthlySummary[key] })),
        classBreakdown: Object.keys(classSummary).map(key => ({ className: key, amount: classSummary[key] })),
        totalCollected: payments.reduce((sum, p) => sum + p.amountPaid, 0)
      }
    });
  } catch (error) {
    console.error('Get fee reports error:', error);
    return res.status(500).json({ success: false, message: 'Server error compiling reports' });
  }
};

// @desc    Export fee payments as CSV
// @route   GET /api/fees/report/csv
// @access  Private (Admin only)
exports.exportFeeCsv = async (req, res) => {
  try {
    const payments = await FeePayment.find({ schoolId: req.schoolId })
      .populate('studentId', 'name email')
      .populate({ path: 'feeStructureId', populate: { path: 'classId', select: 'name section' } });

    // Construct CSV header
    let csvContent = 'Invoice Number,Student Name,Student Email,Class,Fee Type,Amount Paid,Payment Mode,Date,Status\n';

    payments.forEach(pay => {
      const studentName = pay.studentId ? pay.studentId.name : 'Unknown';
      const studentEmail = pay.studentId ? pay.studentId.email : 'N/A';
      const className = (pay.feeStructureId && pay.feeStructureId.classId) 
        ? `${pay.feeStructureId.classId.name} ${pay.feeStructureId.classId.section}` 
        : 'N/A';
      const feeType = pay.feeStructureId ? pay.feeStructureId.feeType : 'N/A';
      const dateStr = new Date(pay.paymentDate).toLocaleDateString();

      // Escape fields with commas
      csvContent += `"${pay.invoiceNumber}","${studentName}","${studentEmail}","${className}","${feeType}",${pay.amountPaid},"${pay.paymentMode}","${dateStr}","${pay.status}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=fee_collection_report.csv');
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export fee CSV error:', error);
    return res.status(500).json({ success: false, message: 'Server error exporting CSV file' });
  }
};
