const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a category name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Name can not be more than 50 characters']
  },
  slug: String,
  icon: {
    type: String, // Cloudinary URL or icon class
    default: null
  },
  type: {
    type: String,
    enum: ['video', 'product'],
    default: 'video'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'creatorModel'
  },
  creatorModel: {
    type: String,
    required: true,
    enum: ['User', 'Admin'],
    default: 'Admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create category slug from the name
categorySchema.pre('save', function(next) {
  if (this.name) {
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
