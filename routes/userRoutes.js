const express = require('express');
const {
  register,
  sendOtp,
  login,
  forgotPassword,
  resetPasswordWithOtp,
  getMe,
  updateDetails,
  uploadProfilePicture,
  addAddress,
  updateAddress,
  deleteAddress,
  toggleSubscribe,
  getPublicProfile
} = require('../controllers/userController');

const { protectUser } = require('../middleware/auth');
const upload = require('../config/multer');

const router = express.Router();

router.post('/register', register);
router.post('/send-otp', sendOtp);
router.post('/login', login);
router.post('/forgotpassword', forgotPassword);
router.post('/resetpassword-otp', resetPasswordWithOtp);
router.get('/me', protectUser, getMe);
router.put('/updatedetails', protectUser, updateDetails);
router.post('/upload-photo', protectUser, upload.single('file'), uploadProfilePicture);

// Address routes
router.route('/address')
    .post(protectUser, addAddress);

router.route('/address/:id')
    .put(protectUser, updateAddress)
    .delete(protectUser, deleteAddress);

// Subscribe/Unsubscribe
router.post('/subscribe/:creatorId', protectUser, toggleSubscribe);

// Public profile
router.get('/profile/:id', getPublicProfile);

module.exports = router;
