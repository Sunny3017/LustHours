const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory
} = require('../controllers/productController');

const { protect, authorize } = require('../middleware/auth');
const upload = require('../config/multer');

const router = express.Router();

router.route('/')
  .get(getProducts)
  .post(protect, authorize('admin', 'superadmin'), upload.fields([{ name: 'images', maxCount: 10 }, { name: 'qrCode', maxCount: 1 }]), createProduct);

router.route('/category/:categoryId')
  .get(getProductsByCategory);

router.route('/:id')
  .get(getProduct)
  .put(protect, authorize('admin', 'superadmin'), upload.fields([{ name: 'images', maxCount: 10 }, { name: 'qrCode', maxCount: 1 }]), updateProduct)
  .delete(protect, authorize('admin', 'superadmin'), deleteProduct);

module.exports = router;
