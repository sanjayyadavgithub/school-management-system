const ContactInquiry = require('../models/ContactInquiry');

// @desc    Submit a new contact inquiry (Public Landing Page)
// @route   POST /api/contact
// @access  Public
exports.submitInquiry = async (req, res) => {
  const { name, email, phone, message } = req.body;

  try {
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    }

    const newInquiry = await ContactInquiry.create({
      name,
      email,
      phone: phone || '',
      message,
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your inquiry has been received and saved. Our team will contact you shortly.',
      inquiry: newInquiry,
    });
  } catch (error) {
    console.error('Submit contact inquiry error:', error);
    return res.status(500).json({ success: false, message: 'Server error saving inquiry' });
  }
};

// @desc    Get all website contact inquiries
// @route   GET /api/contact
// @access  Private (SuperAdmin only)
exports.getInquiries = async (req, res) => {
  try {
    const inquiries = await ContactInquiry.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: inquiries.length, inquiries });
  } catch (error) {
    console.error('Get contact inquiries error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving inquiries' });
  }
};

// @desc    Update inquiry status
// @route   PATCH /api/contact/:id/status
// @access  Private (SuperAdmin only)
exports.updateInquiryStatus = async (req, res) => {
  const { status } = req.body;

  try {
    if (!['New', 'Contacted', 'Resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const inquiry = await ContactInquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry record not found' });
    }

    return res.status(200).json({ success: true, message: `Inquiry status updated to ${status}`, inquiry });
  } catch (error) {
    console.error('Update inquiry status error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating inquiry status' });
  }
};

// @desc    Delete an inquiry
// @route   DELETE /api/contact/:id
// @access  Private (SuperAdmin only)
exports.deleteInquiry = async (req, res) => {
  try {
    const inquiry = await ContactInquiry.findByIdAndDelete(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry record not found' });
    }

    return res.status(200).json({ success: true, message: 'Inquiry deleted successfully' });
  } catch (error) {
    console.error('Delete inquiry error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting inquiry' });
  }
};
