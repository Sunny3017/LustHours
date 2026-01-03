const express = require('express');
const {
  uploadVideo,
  getVideos,
  getVideo,
  getAllVideosAdmin,
  updateVideoStatus,
  deleteVideo,
  getTrendingVideos,
  getSubscribedVideos,
  getLikedVideos,
  getHistory,
  searchVideos,
  getRelatedVideos,
  toggleTrendingStatus,
  toggleLike,
  addToHistory,
  updateVideoMetrics
} = require('../controllers/videoController');

const router = express.Router();

const { protectUser, protect, protectAny, authorize } = require('../middleware/auth');
const upload = require('../config/multer');

router.route('/')
  .get(getVideos);

router.get('/search', searchVideos);
router.get('/trending', getTrendingVideos);
router.get('/subscribed', protectUser, getSubscribedVideos);
router.get('/liked', protectUser, getLikedVideos);
router.get('/history', protectUser, getHistory);

// Like and History actions
router.post('/:id/like', protectUser, toggleLike);
router.post('/:id/history', protectUser, addToHistory);

router.post('/upload', protectAny, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), uploadVideo);

router.get('/admin/all', protectAny, authorize('admin', 'superadmin'), getAllVideosAdmin);

router.get('/:id/related', getRelatedVideos);
router.put('/:id/trending', protect, authorize('admin', 'superadmin'), toggleTrendingStatus);

router.route('/:id')
  .get(getVideo)
  .delete(protectAny, deleteVideo);

router.put('/:id/status', protectAny, authorize('admin', 'superadmin'), updateVideoStatus);
router.put('/:id/metrics', protectAny, authorize('admin', 'superadmin'), updateVideoMetrics);

module.exports = router;
