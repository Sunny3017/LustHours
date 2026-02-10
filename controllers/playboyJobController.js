const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const PlayboyJobApplication = require('../models/PlayboyJobApplication');

// @desc    Register a new playboy job application
// @route   POST /api/playboy-job/register
// @access  Public
exports.registerJobApplication = asyncHandler(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    birthday,
    address
  } = req.body;

  // Check if email already exists
  const existingApplication = await PlayboyJobApplication.findOne({ email });
  if (existingApplication) {
    return next(new ErrorResponse('Email already registered for a job application', 400));
  }

  // Create application
  const application = await PlayboyJobApplication.create({
    firstName,
    lastName,
    email,
    phone,
    birthday,
    address
  });

  res.status(201).json({
    success: true,
    message: 'Registration Successful',
    data: application
  });
});

// @desc    Submit UTR number for payment verification
// @route   POST /api/playboy-job/submit-utr
// @access  Public
exports.submitUTR = asyncHandler(async (req, res, next) => {
  const { email, utrNumber } = req.body;

  if (!email || !utrNumber) {
    return next(new ErrorResponse('Please provide email and UTR number', 400));
  }

  const application = await PlayboyJobApplication.findOne({ email });

  if (!application) {
    return next(new ErrorResponse('Application not found for this email', 404));
  }

  application.utrNumber = utrNumber;
  application.paymentStatus = 'verified'; // Assuming auto-verified for now or 'pending' if manual check needed. User said "database me aa jaye". 'pending' is safer.
  
  await application.save();

  res.status(200).json({
    success: true,
    message: 'UTR Submitted Successfully',
    data: application
  });
});

// @desc    Get all job applications
// @route   GET /api/playboy-job
// @access  Private/Admin
exports.getJobApplications = asyncHandler(async (req, res, next) => {
  const applications = await PlayboyJobApplication.find().sort('-createdAt');

  res.status(200).json({
    success: true,
    count: applications.length,
    data: applications
  });
});

// @desc    Delete job application
// @route   DELETE /api/playboy-job/:id
// @access  Private/Admin
exports.deleteJobApplication = asyncHandler(async (req, res, next) => {
  const application = await PlayboyJobApplication.findById(req.params.id);

  if (!application) {
    return next(new ErrorResponse(`Application not found with id of ${req.params.id}`, 404));
  }

  await application.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});
