const express = require('express');
const {
  submitContact,
  getContacts,
  deleteContact
} = require('../controllers/contactController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .post(submitContact)
  .get(protect, authorize('admin', 'superadmin'), getContacts);

router
  .route('/:id')
  .delete(protect, authorize('admin', 'superadmin'), deleteContact);

module.exports = router;
