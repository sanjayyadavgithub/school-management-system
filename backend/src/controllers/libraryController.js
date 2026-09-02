const Book = require('../models/Book');
const Lending = require('../models/Lending');

// @desc    Add a book to catalog
// @route   POST /api/library/books
// @access  Private (Admin/Librarian)
exports.addBook = async (req, res) => {
  const { title, author, publisher, isbn, category, type, fileUrl, totalCopies, shelfLocation } = req.body;
  try {
    if (!title || !author || !category || !type) {
      return res.status(400).json({ success: false, message: 'Title, Author, Category, and Type are required' });
    }

    const availableCopies = type === 'Ebook' ? 0 : totalCopies || 1;

    const book = await Book.create({
      schoolId: req.schoolId,
      title,
      author,
      publisher,
      isbn,
      category,
      type,
      fileUrl,
      totalCopies: type === 'Ebook' ? 0 : totalCopies || 1,
      availableCopies,
      shelfLocation
    });

    return res.status(201).json({ success: true, book });
  } catch (error) {
    console.error('Add book error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error adding book' });
  }
};

// @desc    Get books in catalog (with search & filters)
// @route   GET /api/library/books
// @access  Private
exports.getBooks = async (req, res) => {
  const { search, category, type } = req.query;
  try {
    const query = { schoolId: req.schoolId };

    if (category) {
      query.category = category;
    }

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { isbn: { $regex: search, $options: 'i' } }
      ];
    }

    const books = await Book.find(query);
    return res.status(200).json({ success: true, count: books.length, books });
  } catch (error) {
    console.error('Get books error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving books' });
  }
};

// @desc    Issue/Lend a book
// @route   POST /api/library/lend
// @access  Private (Admin/Librarian)
exports.lendBook = async (req, res) => {
  const { bookId, userId, durationDays } = req.body;
  try {
    if (!bookId || !userId) {
      return res.status(400).json({ success: false, message: 'bookId and userId are required' });
    }

    const book = await Book.findOne({ _id: bookId, schoolId: req.schoolId });
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found in this school' });
    }

    if (book.type === 'Ebook') {
      return res.status(400).json({ success: false, message: 'E-books do not require physical lending' });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({ success: false, message: 'No copies available for lending' });
    }

    // Check if user already has this book checked out
    const activeLend = await Lending.findOne({
      schoolId: req.schoolId,
      bookId,
      userId,
      status: 'Issued'
    });

    if (activeLend) {
      return res.status(400).json({ success: false, message: 'User already has an active issue for this book' });
    }

    const issueDate = new Date();
    const days = durationDays || 14; // Default lending period: 2 weeks
    const dueDate = new Date();
    dueDate.setDate(issueDate.getDate() + days);

    const lending = await Lending.create({
      schoolId: req.schoolId,
      bookId,
      userId,
      issueDate,
      dueDate,
      status: 'Issued'
    });

    // Decrement available copies
    book.availableCopies -= 1;
    await book.save();

    return res.status(201).json({ success: true, lending });
  } catch (error) {
    console.error('Lend book error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error lending book' });
  }
};

// @desc    Return a book
// @route   POST /api/library/return
// @access  Private (Admin/Librarian)
exports.returnBook = async (req, res) => {
  const { lendingId } = req.body;
  try {
    if (!lendingId) {
      return res.status(400).json({ success: false, message: 'lendingId is required' });
    }

    const lending = await Lending.findOne({ _id: lendingId, schoolId: req.schoolId });
    if (!lending || lending.status === 'Returned') {
      return res.status(400).json({ success: false, message: 'Valid active lending record not found' });
    }

    const returnDate = new Date();
    let fineAmount = 0;

    // Calculate fine: e.g., ₹5 per day overdue
    if (returnDate > lending.dueDate) {
      const diffTime = Math.abs(returnDate - lending.dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fineAmount = diffDays * 5;
    }

    lending.returnDate = returnDate;
    lending.fineAmount = fineAmount;
    lending.status = 'Returned';
    await lending.save();

    // Increment available copies
    const book = await Book.findById(lending.bookId);
    if (book) {
      book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
      await book.save();
    }

    return res.status(200).json({ success: true, message: 'Book returned successfully', fineAmount, lending });
  } catch (error) {
    console.error('Return book error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing return' });
  }
};

// @desc    Get user's own lending history
// @route   GET /api/library/my-lendings
// @access  Private
exports.getMyLendings = async (req, res) => {
  try {
    const lendings = await Lending.find({ userId: req.user._id, schoolId: req.schoolId })
      .populate('bookId', 'title author type fileUrl');
    return res.status(200).json({ success: true, lendings });
  } catch (error) {
    console.error('Get my lendings error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving lending history' });
  }
};
