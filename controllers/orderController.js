const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Order = require('../models/Order');

// @desc    Create new order
// @route   POST /api/orders
// @access  Public
exports.createOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.create(req.body);

  res.status(201).json({
    success: true,
    data: order
  });
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
exports.getOrders = asyncHandler(async (req, res, next) => {
  const orders = await Order.find().populate('product', 'name price').sort('-createdAt');

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private/Admin
exports.deleteOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
  }

  await order.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});
