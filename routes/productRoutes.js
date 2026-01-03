const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getProducts)
  .post(protect, authorize('admin', 'superadmin'), createProduct);

router.route('/:id')
  .get(getProduct)
  .put(protect, authorize('admin', 'superadmin'), updateProduct)
  .delete(protect, authorize('admin', 'superadmin'), deleteProduct);

module.exports = router;
