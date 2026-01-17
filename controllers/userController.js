const User = require('../models/User');
const Otp = require('../models/Otp');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { uploadToCloudinary } = require('../config/cloudinary');
const {
  sendSignupOtpEmail,
  sendPasswordResetOtpEmail
} = require('../services/emailService');
const crypto = require('crypto');

// @desc    Send OTP for registration
// @route   POST /api/v1/auth/user/send-otp
// @access  Public
exports.sendOtp = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorResponse('Please provide an email', 400));
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new ErrorResponse('User already exists with this email', 400));
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Create OTP record (upsert to handle retries)
  await Otp.findOneAndUpdate(
    { email },
    { otp, createdAt: Date.now() },
    { upsert: true, new: true }
  );

  // Send Email
  try {
    await sendSignupOtpEmail({ email, otp });

    res.status(200).json({
      success: true,
      data: 'OTP sent to email'
    });
  } catch (err) {
    // If email fails, delete the OTP so user can try again cleanly
    await Otp.findOneAndDelete({ email });
    
    // Log error for Render debugging
    console.error(`SendOTP Error for ${email}:`, err.message);
    
    return next(new ErrorResponse('Email could not be sent. Please try again later.', 500));
  }
});

// @desc    Register user
// @route   POST /api/v1/auth/user/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { username, email, password, otp } = req.body;

  // Validate required fields
  if (!username || !email || !password || !otp) {
    return next(new ErrorResponse('Please provide all required fields', 400));
  }

  // Validate password length
  if (password.length < 8) {
    return next(new ErrorResponse('Password must be at least 8 characters long', 400));
  }

  // Verify OTP
  const otpRecord = await Otp.findOne({ email, otp });
  if (!otpRecord) {
    return next(new ErrorResponse('Invalid or expired OTP', 400));
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password
  });

  // Delete OTP after successful registration
  await Otp.findOneAndDelete({ email });

  sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/v1/auth/user/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide email and password', 400));
  }

  // Check for user
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if password matches
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }
  
  if (!user.isActive) {
      return next(new ErrorResponse('Your account has been deactivated', 401));
  }

  sendTokenResponse(user, 200, res);
});

// @desc    Forgot Password (Send OTP)
// @route   POST /api/v1/auth/user/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Create OTP record (upsert to handle retries)
  await Otp.findOneAndUpdate(
    { email },
    { otp, createdAt: Date.now() },
    { upsert: true, new: true }
  );

  try {
    await sendPasswordResetOtpEmail({ email: user.email, otp });

    res.status(200).json({
      success: true,
      data: 'OTP sent to email'
    });
  } catch (err) {
    const meta = { code: err.meta?.code || err.code, response: err.meta?.response || err.response, message: err.meta?.message || err.message };
    console.log(JSON.stringify({ op: 'user.forgotPassword', error: meta }));
    await Otp.findOneAndDelete({ email });
    return next(new ErrorResponse('EMAIL_SEND_FAILED', 500));
  }
});

// @desc    Reset Password with OTP
// @route   POST /api/v1/auth/user/resetpassword-otp
// @access  Public
exports.resetPasswordWithOtp = asyncHandler(async (req, res, next) => {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return next(new ErrorResponse('Please provide email, otp and new password', 400));
  }

  // Verify OTP
  const otpRecord = await Otp.findOne({ email, otp });
  if (!otpRecord) {
    return next(new ErrorResponse('Invalid or expired OTP', 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Set new password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // Delete OTP after successful reset
  await Otp.findOneAndDelete({ email });

  sendTokenResponse(user, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/user/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate('likedVideos', 'title thumbnailUrl')
    .populate('subscribedTo', 'username profilePicture')
    .populate('watchHistory', 'title thumbnailUrl');

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user details
// @route   PUT /api/v1/auth/user/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    username: req.body.username,
    email: req.body.email,
    phoneNumber: req.body.phoneNumber,
    preferences: req.body.preferences
  };

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Upload profile picture
// @route   POST /api/v1/auth/user/upload-photo
// @access  Private
exports.uploadProfilePicture = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  // Upload to Cloudinary
  const result = await uploadToCloudinary(req.file.buffer, 'users', 'image');

  const user = await User.findByIdAndUpdate(req.user.id, {
    profilePicture: result.secure_url
  }, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Add address
// @route   POST /api/v1/auth/user/address
// @access  Private
exports.addAddress = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  user.addresses.push(req.body);
  await user.save();

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update address
// @route   PUT /api/v1/auth/user/address/:id
// @access  Private
exports.updateAddress = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const address = user.addresses.id(req.params.id);

  if (!address) {
    return next(new ErrorResponse('Address not found', 404));
  }

  // Update fields
  if (req.body.street) address.street = req.body.street;
  if (req.body.city) address.city = req.body.city;
  if (req.body.state) address.state = req.body.state;
  if (req.body.zipCode) address.zipCode = req.body.zipCode;
  if (req.body.country) address.country = req.body.country;
  if (req.body.isDefault !== undefined) {
      // If setting to default, unset others
      if (req.body.isDefault) {
          user.addresses.forEach(addr => addr.isDefault = false);
      }
      address.isDefault = req.body.isDefault;
  }

  await user.save();

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete address
// @route   DELETE /api/v1/auth/user/address/:id
// @access  Private
exports.deleteAddress = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  user.addresses.pull(req.params.id);
  await user.save();

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Subscribe/Unsubscribe to channel
// @route   POST /api/v1/auth/user/subscribe/:creatorId
// @access  Private
exports.toggleSubscribe = asyncHandler(async (req, res, next) => {
  const creatorId = req.params.creatorId;
  const userId = req.user.id;

  if (creatorId === userId) {
    return next(new ErrorResponse('You cannot subscribe to yourself', 400));
  }

  const user = await User.findById(userId);
  const creator = await User.findById(creatorId);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (!creator) {
    return next(new ErrorResponse('Creator not found', 404));
  }

  const isSubscribed = user.subscribedTo.some(
    subId => subId.toString() === creatorId
  );

  if (isSubscribed) {
    // Unsubscribe: Remove from user's subscribedTo and creator's subscribers
    user.subscribedTo = user.subscribedTo.filter(
      subId => subId.toString() !== creatorId
    );
    creator.subscribers = creator.subscribers.filter(
      subId => subId.toString() !== userId
    );
  } else {
    // Subscribe: Add to both arrays (prevent duplicates)
    if (!user.subscribedTo.some(id => id.toString() === creatorId)) {
      user.subscribedTo.push(creatorId);
    }
    if (!creator.subscribers.some(id => id.toString() === userId)) {
      creator.subscribers.push(userId);
    }
  }

  await Promise.all([user.save(), creator.save()]);

  res.status(200).json({
    success: true,
    data: {
      isSubscribed: !isSubscribed,
      subscribersCount: creator.subscribers.length
    }
  });
});

// @desc    Get public user profile
// @route   GET /api/v1/auth/user/profile/:id
// @access  Public
exports.getPublicProfile = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;

  const user = await User.findById(userId)
    .select('username profilePicture subscribers subscribedTo');

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Get user's videos
  const Video = require('../models/Video');
  const videos = await Video.find({ 
    creator: userId,
    status: 'approved'
  })
    .populate('creator', 'username profilePicture')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    data: {
      user: {
        _id: user._id,
        username: user.username,
        profilePicture: user.profilePicture,
        subscribersCount: user.subscribers.length
      },
      videos
    }
  });
});

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.generateAuthToken();

  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user
    });
};
