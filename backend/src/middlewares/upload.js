const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinary, isConfigured } = require('../config/cloudinary');

// Ensure local uploads folder exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage Configuration for Local Fallback
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept PDFs, Images, and Docs
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|ppt|pptx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only document files (PDF, Word, Excel, PPT) and images are allowed!'));
    }
  }
});

// Middleware wrapper to handle Cloudinary uploads if configured
const uploadToCloud = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // If Cloudinary is not configured, serve locally
  if (!isConfigured) {
    // Map file path to relative local URL
    req.fileUrl = `/uploads/${req.file.filename}`;
    return next();
  }

  try {
    // Upload local file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: `sms_tenant_${req.schoolId || 'public'}`,
      resource_type: 'auto',
    });

    // Remove local temp file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Failed to delete temp file:', err);
    });

    req.fileUrl = result.secure_url;
    next();
  } catch (error) {
    console.error('Cloudinary upload failure, using local file instead:', error.message);
    req.fileUrl = `/uploads/${req.file.filename}`;
    next();
  }
};

module.exports = {
  upload,
  uploadToCloud,
};
