const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    default: ''
  },
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required']
  },
  videoSourceType: {
    type: String,
    enum: ['upload', 'google_drive'],
    default: 'upload',
    index: true
  },
  thumbnailUrl: {
    type: String,
    required: [true, 'Thumbnail URL is required']
  },
  cloudinaryPublicId: {
    type: String
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  size: {
    type: Number, // in bytes
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'creatorModel',
    required: true,
    index: true
  },
  creatorModel: {
    type: String,
    required: true,
    enum: ['User', 'Admin'],
    default: 'User'
  },
  views: {
    type: Number,
    default: 0
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  tags: {
    type: [String],
    default: []
  },
  likes: {
    type: Number,
    default: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
videoSchema.index({ creator: 1, createdAt: -1 });
videoSchema.index({ status: 1 });
videoSchema.index({ title: 'text', description: 'text' }); // Text search index
videoSchema.index({ likes: 1 });

module.exports = mongoose.model('Video', videoSchema);
