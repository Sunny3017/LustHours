const express = require('express');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminCategories,
  updateCategoryStatus
} = require('../controllers/categoryController');

const { protect, authorize, protectAny } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getCategories)
  .post(protectAny, createCategory);

router.get('/admin/all', protect, authorize('admin', 'superadmin'), getAdminCategories);
router.put('/:id/status', protect, authorize('admin', 'superadmin'), updateCategoryStatus);

router.route('/:id')
  .get(getCategory)
  .put(protect, authorize('admin', 'superadmin'), updateCategory)
  .delete(protect, authorize('admin', 'superadmin'), deleteCategory);

module.exports = router;
