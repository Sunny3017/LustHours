const express = require('express');
const { 
  registerJobApplication, 
  submitUTR,
  getJobApplications,
  deleteJobApplication
} = require('../controllers/playboyJobController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerJobApplication);
router.post('/submit-utr', submitUTR);

router
  .route('/')
  .get(protect, authorize('admin', 'superadmin'), getJobApplications);

router
  .route('/:id')
  .delete(protect, authorize('admin', 'superadmin'), deleteJobApplication);

module.exports = router;
