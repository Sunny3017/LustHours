const express = require('express');
const {
  createOrder,
  getOrders,
  deleteOrder
} = require('../controllers/orderController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .post(createOrder)
  .get(protect, authorize('admin', 'superadmin'), getOrders);

router
  .route('/:id')
  .delete(protect, authorize('admin', 'superadmin'), deleteOrder);

module.exports = router;
