// backend/models/View.js
import mongoose from 'mongoose';

const viewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
    index: true
  },
  ipAddress: String,
  userAgent: String,
  watchedDuration: {
    type: Number,
    default: 0,
    min: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  viewedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for unique views tracking (same user/video within 24 hours)
viewSchema.index({ user: 1, video: 1, viewedAt: 1 });
viewSchema.index({ video: 1, viewedAt: -1 });
viewSchema.index({ viewedAt: -1 });

const View = mongoose.model('View', viewSchema);

export default View;