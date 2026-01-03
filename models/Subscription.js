// backend/models/Subscription.js
import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  subscriberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired'],
    default: 'active'
  },
  subscriptionPrice: {
    type: Number,
    required: true,
    min: 0
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  cancelledAt: Date,
  expiresAt: {
    type: Date,
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 30); // 30-day subscription
      return date;
    }
  },
  autoRenew: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for unique active subscriptions
subscriptionSchema.index({ subscriberId: 1, creatorId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
subscriptionSchema.index({ creatorId: 1, subscribedAt: -1 });
subscriptionSchema.index({ expiresAt: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;