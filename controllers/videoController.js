const Video = require('../models/Video');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

 

// @desc    Upload a video
// @route   POST /api/v1/videos/upload
// @access  Private
exports.uploadVideo = asyncHandler(async (req, res, next) => {
  if (!req.files || !req.files.video || !req.files.thumbnail) {
    return next(new ErrorResponse('Please upload both video and thumbnail', 400));
  }

  const videoFile = req.files.video[0];
  const thumbnailFile = req.files.thumbnail[0];

  // Upload Video
  const videoResult = await uploadToCloudinary(videoFile.buffer, 'videos', 'video');
  
  // Upload Thumbnail
  const thumbnailResult = await uploadToCloudinary(thumbnailFile.buffer, 'thumbnails', 'image');

  let tags = [];
  if (req.body.tags) {
    tags = req.body.tags.split(',').map(tag => tag.trim());
  }

  const creatorId = req.user ? req.user.id : req.admin.id;
  const creatorModel = req.user ? 'User' : 'Admin';

  const video = await Video.create({
    title: req.body.title,
    description: req.body.description,
    videoUrl: videoResult.secure_url,
    thumbnailUrl: thumbnailResult.secure_url,
    cloudinaryPublicId: videoResult.public_id,
    duration: videoResult.duration || 0,
    size: videoResult.bytes,
    creator: creatorId,
    creatorModel: creatorModel,
    category: req.body.category,
    tags: tags,
    videoSourceType: 'upload'
  });

  res.status(201).json({
    success: true,
    data: video
  });
});

 

// @desc    Get all public approved videos
// @route   GET /api/v1/videos
// @access  Public
exports.getVideos = asyncHandler(async (req, res, next) => {
  const { search } = req.query;
  
  let query = { status: 'approved' };
  
  // Add search functionality
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const videos = await Video.find(query)
    .populate('creator', 'username name profilePicture profileImage')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: videos.length,
    data: videos
  });
});

// @desc    Search videos
// @route   GET /api/v1/videos/search
// @access  Public
exports.searchVideos = asyncHandler(async (req, res, next) => {
  const { q } = req.query;
  
  if (!q || q.trim() === '') {
    return res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  }

  const limit = 50;
  const queryText = q.trim();
  const keywords = queryText.split(/\s+/).filter(k => k.length > 0);
  const regexPatterns = keywords.map(k => new RegExp(k, 'i'));

  const queries = [];

  // Query 1: Text search using MongoDB text index (title + description)
  queries.push(
    Video.find({
      status: 'approved',
      $text: { $search: queryText }
    })
    .populate('creator', 'username name profilePicture profileImage')
    .sort({ score: { $meta: 'textScore' }, views: -1, createdAt: -1 })
    .limit(limit)
  );

  // Query 2: Regex-based match on title/description/tags
  queries.push(
    Video.find({
      status: 'approved',
      $or: [
        { title: { $in: regexPatterns } },
        { description: { $in: regexPatterns } },
        { tags: { $in: regexPatterns } }
      ]
    })
    .populate('creator', 'username name profilePicture profileImage')
    .sort({ views: -1, createdAt: -1 })
    .limit(limit)
  );

  const results = await Promise.all(queries);
  const allVideos = results.flat();

  const uniqueMap = new Map();
  for (const v of allVideos) {
    const id = v._id.toString();
    if (!uniqueMap.has(id)) {
      uniqueMap.set(id, v);
    }
  }
  const merged = Array.from(uniqueMap.values()).slice(0, limit);

  res.status(200).json({
    success: true,
    count: merged.length,
    data: merged
  });
});

// @desc    Get single video
// @route   GET /api/v1/videos/:id
// @access  Public
exports.getVideo = asyncHandler(async (req, res, next) => {
  const video = await Video.findById(req.params.id)
    .populate('creator', 'username name profilePicture profileImage subscribers');

  if (!video) {
    return next(new ErrorResponse(`Video not found with id of ${req.params.id}`, 404));
  }

  // If video is not approved, only creator or admin can view
  if (video.status !== 'approved') {
    // Check if user is logged in
    // This logic might need adjustment based on how auth is handled in getSingleVideo
    // For now, assume public access only for approved. 
    // If strict private/pending logic is needed, we need to check req.user
  }
  
  // Increment views
  video.views += 1;
  await video.save();

  // Add subscribers count to creator
  if (video.creator && video.creator.subscribers) {
    video.creator.subscribersCount = video.creator.subscribers.length;
  }

  res.status(200).json({
    success: true,
    data: video
  });
});

// @desc    Get all videos (Admin)
// @route   GET /api/v1/videos/admin/all
// @access  Private (Admin)
exports.getAllVideosAdmin = asyncHandler(async (req, res, next) => {
  const videos = await Video.find()
    .populate('creator', 'username name email')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: videos.length,
    data: videos
  });
});

// @desc    Update video status (Approve/Reject)
// @route   PUT /api/v1/videos/:id/status
// @access  Private (Admin)
exports.updateVideoStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return next(new ErrorResponse('Invalid status', 400));
  }

  const video = await Video.findByIdAndUpdate(req.params.id, { status }, {
    new: true,
    runValidators: true
  });

  if (!video) {
    return next(new ErrorResponse(`Video not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: video
  });
});

// @desc    Delete video
// @route   DELETE /api/v1/videos/:id
// @access  Private (Owner/Admin)
exports.deleteVideo = asyncHandler(async (req, res, next) => {
  const video = await Video.findById(req.params.id);

  if (!video) {
    return next(new ErrorResponse(`Video not found with id of ${req.params.id}`, 404));
  }

  // Check ownership (if not admin)
  if (!req.admin) {
    // If it's not an admin, it must be the owner
    // Also check creatorModel if available
    const isOwner = video.creator.toString() === req.user.id;
    if (!req.user || !isOwner) {
        return next(new ErrorResponse('Not authorized to delete this video', 403));
    }
  }

  if (video.videoSourceType === 'upload' && video.cloudinaryPublicId) {
    await deleteFromCloudinary(video.cloudinaryPublicId, 'video');
  }
  await video.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get trending videos
// @route   GET /api/v1/videos/trending
// @access  Public
exports.getTrendingVideos = asyncHandler(async (req, res, next) => {
  const videos = await Video.find({ status: 'approved' })
    .populate('creator', 'username name profilePicture profileImage')
    .sort({ isTrending: -1, views: -1 }) // Prioritize manually trending, then views
    .limit(20);

  res.status(200).json({
    success: true,
    count: videos.length,
    data: videos
  });
});

// @desc    Get related videos
// @route   GET /api/v1/videos/:id/related
// @access  Public
exports.getRelatedVideos = asyncHandler(async (req, res, next) => {
  const video = await Video.findById(req.params.id);

  if (!video) {
    return next(new ErrorResponse(`Video not found with id of ${req.params.id}`, 404));
  }

  const limit = 10;
  let relatedVideos = [];
  
  // Strategy:
  // 1. Fetch by Category/Tags (Contextual)
  // 2. Fetch by Text Search (Keywords) - Must be top-level query
  // 3. Merge and Deduplicate
  
  const queries = [];

  // Query 1: Context (Category or Tags)
  let contextCriteria = [];
  if (video.category) {
    contextCriteria.push({ category: video.category });
  }
  if (video.tags && video.tags.length > 0) {
    contextCriteria.push({ tags: { $in: video.tags } });
  }

  if (contextCriteria.length > 0) {
    queries.push(
      Video.find({
        status: 'approved',
        _id: { $ne: video._id },
        $or: contextCriteria
      })
      .populate('creator', 'username name profilePicture profileImage')
      .sort('-views')
      .limit(limit)
    );
  }

  // Query 2: Text Search (Title Keywords)
  // Only if title exists and we haven't filled the limit with context yet (optimization: fetch both for better mix)
  if (video.title) {
    queries.push(
      Video.find({
        status: 'approved',
        _id: { $ne: video._id },
        $text: { $search: video.title }
      })
      .populate('creator', 'username name profilePicture profileImage')
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
    );
  }

  // Execute parallel queries
  const results = await Promise.all(queries);
  
  // Merge results
  const allVideos = results.flat();
  
  // Deduplicate using Map
  const uniqueVideosMap = new Map();
  allVideos.forEach(v => {
    if (!uniqueVideosMap.has(v._id.toString())) {
      uniqueVideosMap.set(v._id.toString(), v);
    }
  });
  
  relatedVideos = Array.from(uniqueVideosMap.values());
  
  // Limit to desired count (prioritizing the order they came in: Context -> Text)
  if (relatedVideos.length > limit) {
    relatedVideos = relatedVideos.slice(0, limit);
  }

  // 2. Fallback: If not enough videos, fetch latest/random ones
  if (relatedVideos.length < limit) {
    const needed = limit - relatedVideos.length;
    const existingIds = [video._id, ...relatedVideos.map(v => v._id)];

    const fallbackVideos = await Video.find({
      status: 'approved',
      _id: { $nin: existingIds }
    })
      .populate('creator', 'username name profilePicture profileImage')
      .sort('-createdAt') // Latest
      .limit(needed);
      
    relatedVideos = [...relatedVideos, ...fallbackVideos];
  }

  res.status(200).json({
    success: true,
    count: relatedVideos.length,
    data: relatedVideos
  });
});

// @desc    Toggle trending status
// @route   PUT /api/v1/videos/:id/trending
// @access  Private (Admin)
exports.toggleTrendingStatus = asyncHandler(async (req, res, next) => {
  const video = await Video.findById(req.params.id);

  if (!video) {
    return next(new ErrorResponse(`Video not found with id of ${req.params.id}`, 404));
  }

  // Use findByIdAndUpdate to avoid validation errors on other fields
  // and to ensure atomic update
  const updatedVideo = await Video.findByIdAndUpdate(
    req.params.id,
    { isTrending: !video.isTrending },
    { new: true, runValidators: false }
  );

  res.status(200).json({
    success: true,
    data: updatedVideo
  });
});

// @desc    Get subscribed videos
// @route   GET /api/v1/videos/subscribed
// @access  Private
exports.getSubscribedVideos = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  const videos = await Video.find({ 
    creator: { $in: user.subscribedTo },
    status: 'approved'
  })
  .populate('creator', 'username name profilePicture profileImage')
  .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: videos.length,
    data: videos
  });
});

// @desc    Get liked videos
// @route   GET /api/v1/videos/liked
// @access  Private
exports.getLikedVideos = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate({
      path: 'likedVideos',
      populate: {
        path: 'creator',
        select: 'username name profilePicture profileImage'
      }
    });

  // Filter out any nulls (deleted videos)
  const videos = user.likedVideos.filter(v => v !== null && v.status === 'approved');

  res.status(200).json({
    success: true,
    count: videos.length,
    data: videos
  });
});

// @desc    Get watch history
// @route   GET /api/v1/videos/history
// @access  Private
exports.getHistory = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate({
      path: 'watchHistory',
      populate: {
        path: 'creator',
        select: 'username name profilePicture profileImage'
      }
    });

  // Filter out any nulls and reverse to show most recent first
  const videos = user.watchHistory
    .filter(v => v !== null && v.status === 'approved')
    .reverse(); // Most recent first

  res.status(200).json({
    success: true,
    count: videos.length,
    data: videos
  });
});

// @desc    Like/Unlike video
// @route   POST /api/v1/videos/:id/like
// @access  Private
exports.toggleLike = asyncHandler(async (req, res, next) => {
  const videoId = req.params.id;
  const userId = req.user.id;

  const video = await Video.findById(videoId);
  if (!video) {
    return next(new ErrorResponse('Video not found', 404));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  const isLiked = user.likedVideos.some(
    likedVideo => likedVideo.toString() === videoId
  );

  if (isLiked) {
    // Unlike: Remove from user's likedVideos and video's likes array
    user.likedVideos = user.likedVideos.filter(
      likedVideo => likedVideo.toString() !== videoId
    );
    video.likes = video.likes.filter(
      like => like.toString() !== userId
    );
  } else {
    // Like: Add to both arrays (prevent duplicates)
    if (!user.likedVideos.some(v => v.toString() === videoId)) {
      user.likedVideos.push(videoId);
    }
    if (!video.likes.some(u => u.toString() === userId)) {
      video.likes.push(userId);
    }
  }

  await Promise.all([user.save(), video.save()]);

  // Get updated video with like count
  const updatedVideo = await Video.findById(videoId)
    .populate('creator', 'username profilePicture');

  res.status(200).json({
    success: true,
    data: {
      isLiked: !isLiked,
      likesCount: updatedVideo.likes.length,
      video: updatedVideo
    }
  });
});

// @desc    Add video to watch history
// @route   POST /api/v1/videos/:id/history
// @access  Private
exports.addToHistory = asyncHandler(async (req, res, next) => {
  const videoId = req.params.id;
  const userId = req.user.id;

  const video = await Video.findById(videoId);
  if (!video) {
    return next(new ErrorResponse('Video not found', 404));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Remove if already exists (to move to end)
  user.watchHistory = user.watchHistory.filter(
    historyVideo => historyVideo.toString() !== videoId
  );
  
  // Add to end (most recent)
  user.watchHistory.push(videoId);

  // Limit history to last 100 videos
  if (user.watchHistory.length > 100) {
    user.watchHistory = user.watchHistory.slice(-100);
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Video added to watch history'
  });
});

// @desc    Update video metrics (Admin only)
// @route   PUT /api/v1/videos/:id/metrics
// @access  Private (Admin only)
exports.updateVideoMetrics = asyncHandler(async (req, res, next) => {
  const videoId = req.params.id;
  const { views, likes } = req.body;

  // Validate that at least one metric is provided
  if (views === undefined && likes === undefined) {
    return next(new ErrorResponse('Please provide views or likes to update', 400));
  }

  // Find video
  const video = await Video.findById(videoId);
  if (!video) {
    return next(new ErrorResponse('Video not found', 404));
  }

  // Validate and update views
  if (views !== undefined) {
    // Validate views is a number and non-negative
    const viewsNum = parseInt(views, 10);
    if (isNaN(viewsNum) || viewsNum < 0) {
      return next(new ErrorResponse('Views must be a non-negative number', 400));
    }
    video.views = viewsNum;
  }

  // Validate and update likes
  if (likes !== undefined) {
    // Validate likes is a number and non-negative
    const likesNum = parseInt(likes, 10);
    if (isNaN(likesNum) || likesNum < 0) {
      return next(new ErrorResponse('Likes must be a non-negative number', 400));
    }

    // Get current likes count
    const currentLikesCount = video.likes ? video.likes.length : 0;
    const likesDelta = likesNum - currentLikesCount;
    
    // Safety Limit: Max 10,000 likes change per request to prevent blocking
    if (Math.abs(likesDelta) > 10000) {
      return next(new ErrorResponse('Cannot change likes by more than 10,000 in a single request', 400));
    }

    if (likesDelta > 0) {
      // Need to add likes
      const mongoose = require('mongoose');
      const newLikes = Array.from({ length: likesDelta }, () => new mongoose.Types.ObjectId());
      video.likes.push(...newLikes);
    } else if (likesDelta < 0) {
      // Need to remove likes - remove from the end
      const removeCount = Math.abs(likesDelta);
      video.likes = video.likes.slice(0, Math.max(0, video.likes.length - removeCount));
    }
    // If likesDelta === 0, no change needed
  }

  await video.save();

  // Return updated video
  const updatedVideo = await Video.findById(videoId)
    .populate('creator', 'username profilePicture')
    .select('-likes'); // Don't return the full likes array to reduce payload

  res.status(200).json({
    success: true,
    message: 'Video metrics updated successfully',
    data: {
      video: {
        _id: updatedVideo._id,
        views: updatedVideo.views,
        likesCount: video.likes ? video.likes.length : 0
      }
    }
  });
});
