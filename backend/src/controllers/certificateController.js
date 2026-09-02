const CertificateTemplate = require('../models/CertificateTemplate');
const IssuedCertificate = require('../models/IssuedCertificate');
const User = require('../models/User');
const crypto = require('crypto');

// @desc    Create Certificate Template
// @route   POST /api/certificates/templates
// @access  Private (Admin)
exports.createTemplate = async (req, res) => {
  const { name, htmlContent, signatureUrl } = req.body;
  try {
    if (!name || !htmlContent) {
      return res.status(400).json({ success: false, message: 'Name and htmlContent are required' });
    }

    const template = await CertificateTemplate.create({
      schoolId: req.schoolId,
      name,
      htmlContent,
      signatureUrl
    });

    return res.status(201).json({ success: true, template });
  } catch (error) {
    console.error('Create template error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating template' });
  }
};

// @desc    Issue Certificate to recipient
// @route   POST /api/certificates/issue
// @access  Private (Admin)
exports.issueCertificate = async (req, res) => {
  const { templateId, recipientId, title, description } = req.body;
  try {
    if (!templateId || !recipientId || !title) {
      return res.status(400).json({ success: false, message: 'templateId, recipientId, and title are required' });
    }

    const template = await CertificateTemplate.findOne({ _id: templateId, schoolId: req.schoolId });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Certificate template not found' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient || recipient.schoolId.toString() !== req.schoolId.toString()) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    const uniqueId = 'CERT-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + Date.now().toString().slice(-4);

    const certificate = await IssuedCertificate.create({
      schoolId: req.schoolId,
      templateId,
      recipientId,
      title,
      description,
      uniqueId,
      issuedBy: req.user._id
    });

    return res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      certificate,
      renderUrl: `/api/certificates/render/${certificate._id}`
    });
  } catch (error) {
    console.error('Issue certificate error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error issuing certificate' });
  }
};

// @desc    Render HTML Certificate for viewing or printing (100% Free layout engine)
// @route   GET /api/certificates/render/:id
// @access  Public
exports.renderCertificate = async (req, res) => {
  try {
    const certificate = await IssuedCertificate.findById(req.params.id)
      .populate('templateId')
      .populate('recipientId', 'name email role')
      .populate('issuedBy', 'name');

    if (!certificate) {
      return res.status(404).send('Certificate not found.');
    }

    let html = certificate.templateId.htmlContent;
    const dateStr = new Date(certificate.issuedAt).toLocaleDateString();

    // Replace template placeholders dynamically
    html = html.replace(/\{\{STUDENT_NAME\}\}/g, certificate.recipientId.name);
    html = html.replace(/\{\{TITLE\}\}/g, certificate.title);
    html = html.replace(/\{\{DESCRIPTION\}\}/g, certificate.description || '');
    html = html.replace(/\{\{DATE\}\}/g, dateStr);
    html = html.replace(/\{\{CERTIFICATE_ID\}\}/g, certificate.uniqueId);
    html = html.replace(/\{\{ISSUER_NAME\}\}/g, certificate.issuedBy.name);

    res.send(`
      <html>
        <head>
          <title>${certificate.title} - ${certificate.recipientId.name}</title>
          <style>
            body { margin: 0; padding: 0; background-color: #f0f3f4; font-family: 'Georgia', serif; }
            .cert-outer-container { padding: 40px; text-align: center; }
            .cert-wrapper { background: #fff; border: 15px solid #2c3e50; padding: 50px; position: relative; max-width: 900px; margin: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15); box-sizing: border-box; }
            .cert-watermark { position: absolute; font-size: 120px; color: rgba(44, 62, 80, 0.03); transform: rotate(-45deg); top: 35%; left: 10%; pointer-events: none; text-transform: uppercase; font-weight: bold; width: 100%; text-align: center; }
            .print-btn { display: inline-block; background: #2c3e50; color: white; padding: 12px 24px; font-family: sans-serif; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; margin-top: 30px; text-decoration: none; }
            @media print {
              .print-btn { display: none; }
              body { background: none; }
              .cert-outer-container { padding: 0; }
              .cert-wrapper { box-shadow: none; border-width: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="cert-outer-container">
            <div class="cert-wrapper">
              <div class="cert-watermark">Official</div>
              ${html}
            </div>
            <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Render certificate error:', error);
    res.status(500).send('Error rendering certificate layout.');
  }
};

// @desc    Verify authenticity of dynamic certificate (Public validator)
// @route   GET /api/certificates/verify/:uniqueId
// @access  Public
exports.verifyCertificate = async (req, res) => {
  try {
    const certificate = await IssuedCertificate.findOne({ uniqueId: req.params.uniqueId })
      .populate('recipientId', 'name email')
      .populate('schoolId', 'name')
      .populate('issuedBy', 'name');

    if (!certificate) {
      return res.status(404).json({ success: false, verified: false, message: 'Invalid certificate identifier' });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      recipientName: certificate.recipientId.name,
      schoolName: certificate.schoolId.name,
      issuedBy: certificate.issuedBy.name,
      issuedAt: certificate.issuedAt,
      title: certificate.title,
      description: certificate.description
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    return res.status(500).json({ success: false, message: 'Server error verifying certificate' });
  }
};

// @desc    Get user's own issued certificates (Achievement Wall)
// @route   GET /api/certificates/my
// @access  Private
exports.getMyCertificates = async (req, res) => {
  try {
    const certificates = await IssuedCertificate.find({ recipientId: req.user._id, schoolId: req.schoolId })
      .populate('issuedBy', 'name');
    return res.status(200).json({ success: true, count: certificates.length, certificates });
  } catch (error) {
    console.error('Get my certificates error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching achievements' });
  }
};
