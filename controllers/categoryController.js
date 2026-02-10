const Category = require('../models/Category');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { uploadToCloudinary } = require('../config/cloudinary');

// @desc    Get all categories
// @route   GET /api/v1/categories
// @access  Public
exports.getCategories = asyncHandler(async (req, res, next) => {
  const query = { isActive: true };
  
  // Filter by type if provided
  if (req.query.type) {
    if (req.query.type === 'video') {
      // Include legacy categories (undefined/null type) as video categories
      query.$or = [{ type: 'video' }, { type: { $exists: false } }, { type: null }];
    } else {
      query.type = req.query.type;
    }
  }

  const categories = await Category.find(query).populate('creator', 'username email');

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories
  });
});

// @desc    Get all categories (Admin - includes inactive)
// @route   GET /api/categories/admin/all
// @access  Private/Admin
exports.getAdminCategories = asyncHandler(async (req, res, next) => {
  const query = {};
  
  // Filter by type if provided
  if (req.query.type) {
    query.type = req.query.type;
  }

  const categories = await Category.find(query);

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories
  });
});

// @desc    Get single category
// @route   GET /api/v1/categories/:id
// @access  Public
exports.getCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: category
  });
});

// @desc    Create category
// @route   POST /api/v1/categories
// @access  Private (Admin)
exports.createCategory = asyncHandler(async (req, res, next) => {
  // Handle icon upload if present
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'categories');
    req.body.icon = result.secure_url;
  }

  // Ensure type is set if provided in body (defaults to 'video' in model)
  // But we want to allow setting it explicitly
  
  // Set creator and status for admin created categories
  // Check if req.user or req.admin exists (authentication middleware should ensure this)
  let creatorId;
  let creatorModel;

  if (req.user) {
    creatorId = req.user.id || req.user._id;
    creatorModel = 'User';
  } else if (req.admin) {
    creatorId = req.admin.id || req.admin._id;
    creatorModel = 'Admin';
  } else {
     // Fallback if no user attached (should not happen in protected route)
     return next(new ErrorResponse('User authentication required', 401));
  }
  
  req.body.creator = creatorId;
  req.body.creatorModel = creatorModel;
  req.body.status = 'approved';

  const category = await Category.create(req.body);

  res.status(201).json({
    success: true,
    data: category
  });
});

// @desc    Update category
// @route   PUT /api/v1/categories/:id
// @access  Private (Admin)
exports.updateCategory = asyncHandler(async (req, res, next) => {
  let category = await Category.findById(req.params.id);

  if (!category) {
    return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
  }

  // Handle icon upload if present
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, 'categories');
    req.body.icon = result.secure_url;
  }

  category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: category
  });
});

// @desc    Delete category
// @route   DELETE /api/v1/categories/:id
// @access  Private (Admin)
exports.deleteCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
  }

  await category.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});
