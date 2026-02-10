const express = require('express');
const {
  getCategories,
  getAdminCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const { protect, authorize } = require('../middleware/auth');
const upload = require('../config/multer');

const router = express.Router();

router.get('/admin/all', protect, authorize('admin', 'superadmin'), getAdminCategories);

router.route('/')
  .get(getCategories)
  .post(protect, authorize('admin', 'superadmin'), upload.single('icon'), createCategory);

router.route('/:id')
  .get(getCategory)
  .put(protect, authorize('admin', 'superadmin'), upload.single('icon'), updateCategory)
  .delete(protect, authorize('admin', 'superadmin'), deleteCategory);

module.exports = router;
