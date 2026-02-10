const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Contact = require('../models/Contact');

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
exports.submitContact = asyncHandler(async (req, res, next) => {
  const contact = await Contact.create(req.body);

  res.status(201).json({
    success: true,
    data: contact
  });
});

// @desc    Get all contact submissions
// @route   GET /api/contact
// @access  Private/Admin
exports.getContacts = asyncHandler(async (req, res, next) => {
  const contacts = await Contact.find().sort('-createdAt');

  res.status(200).json({
    success: true,
    count: contacts.length,
    data: contacts
  });
});

// @desc    Delete contact submission
// @route   DELETE /api/contact/:id
// @access  Private/Admin
exports.deleteContact = asyncHandler(async (req, res, next) => {
  const contact = await Contact.findById(req.params.id);

  if (!contact) {
    return next(new ErrorResponse(`Contact submission not found with id of ${req.params.id}`, 404));
  }

  await contact.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});
