const Category = require('../models/Category');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all public categories
// @route   GET /api/v1/categories
// @access  Public
exports.getCategories = asyncHandler(async (req, res, next) => {
  const categories = await Category.find({ status: 'approved', isActive: true }).populate('parent');

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories
  });
});

// @desc    Get all categories (Admin)
// @route   GET /api/v1/categories/admin/all
// @access  Private (Admin)
exports.getAdminCategories = asyncHandler(async (req, res, next) => {
  const categories = await Category.find()
    .populate('parent')
    .populate('creator', 'name email username');

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
  const category = await Category.findById(req.params.id)
    .populate('parent')
    .populate('creator', 'name username');

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
// @access  Private (User/Admin)
exports.createCategory = asyncHandler(async (req, res, next) => {
  // Determine creator and initial status
  let status = 'pending';
  let creator = null;
  let creatorModel = 'User';

  if (req.admin) {
    status = 'approved';
    creator = req.admin.id;
    creatorModel = 'Admin';
  } else if (req.user) {
    creator = req.user.id;
    creatorModel = 'User';
  }

  const category = await Category.create({
    ...req.body,
    status,
    creator,
    creatorModel
  });

  res.status(201).json({
    success: true,
    data: category
  });
});

// @desc    Update category status
// @route   PUT /api/v1/categories/:id/status
// @access  Private (Admin)
exports.updateCategoryStatus = asyncHandler(async (req, res, next) => {
    const { status } = req.body;
  
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return next(new ErrorResponse('Invalid status', 400));
    }
  
    const category = await Category.findByIdAndUpdate(req.params.id, { status }, {
      new: true,
      runValidators: true
    });
  
    if (!category) {
      return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
    }
  
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

// @desc    Update category
// @route   PUT /api/v1/categories/:id
// @access  Private (Admin)
exports.updateCategory = asyncHandler(async (req, res, next) => {
  let category = await Category.findById(req.params.id);

  if (!category) {
    return next(new ErrorResponse(`Category not found with id of ${req.params.id}`, 404));
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
