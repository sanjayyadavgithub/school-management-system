const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  getAlumniDirectory,
  updateAlumniProfile,
  verifyAlumni,
  postJob,
  getJobs
} = require('../controllers/alumniController');

router.use(protect);

router.get('/directory', getAlumniDirectory);
router.put('/profile', updateAlumniProfile);
router.post('/jobs', postJob);
router.get('/jobs', getJobs);

// Admin-only verification
router.post('/:id/verify', restrictTo('Admin'), verifyAlumni);

module.exports = router;
