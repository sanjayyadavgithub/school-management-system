const express = require('express');
const router = express.Router();
const { uploadMaterial, getMaterials, deleteMaterial } = require('../controllers/materialController');
const { protect, restrictTo } = require('../middlewares/auth');
const { upload, uploadToCloud } = require('../middlewares/upload');

router.use(protect);

router.post('/', 
  restrictTo('Admin', 'Teacher'), 
  upload.single('file'), 
  uploadToCloud, 
  uploadMaterial
);

router.get('/', getMaterials);
router.delete('/:id', restrictTo('Admin', 'Teacher'), deleteMaterial);

module.exports = router;
