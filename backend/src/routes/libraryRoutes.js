const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');
const {
  addBook,
  getBooks,
  lendBook,
  returnBook,
  getMyLendings
} = require('../controllers/libraryController');

// All library routes require authentication
router.use(protect);

router.get('/books', getBooks);
router.get('/my-lendings', getMyLendings);

// Admin-only endpoints for issuing and returning books
router.post('/books', restrictTo('Admin'), addBook);
router.post('/lend', restrictTo('Admin'), lendBook);
router.post('/return', restrictTo('Admin'), returnBook);

module.exports = router;
