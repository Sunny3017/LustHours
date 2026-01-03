const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getMe,
    updateDetails,
    updatePassword,
    forgotPassword,
    resetPassword,
    logout,
    getAdmins,
    getAdmin,
    updateAdmin,
    deleteAdmin,
    toggleAdminStatus,
    sendBulkEmail
} = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Protected routes (Admin only)
router.use(protect);
router.get('/me', getMe);
router.put('/updatedetails', updateDetails);
router.put('/updatepassword', updatePassword);
router.get('/logout', logout);
router.post('/send-bulk-email', sendBulkEmail);

// Superadmin only routes
router.use(authorize('superadmin'));
router.post('/register', register);
router.route('/admins')
    .get(getAdmins);
    
router.route('/admins/:id')
    .get(getAdmin)
    .put(updateAdmin)
    .delete(deleteAdmin);
    
router.put('/admins/:id/toggle-status', toggleAdminStatus);

module.exports = router;