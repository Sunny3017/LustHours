const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    maxlength: [100, 'Name can not be more than 100 characters']
  },
  slug: String,
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [2000, 'Description can not be more than 2000 characters']
  },
  shortDescription: {
    type: String,
    required: [true, 'Please add a short description'],
    maxlength: [500, 'Short description can not be more than 500 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price']
  },
  discountPrice: {
    type: Number
  },
  discountPercentage: {
    type: Number
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  images: [{
    type: String // Array of Cloudinary URLs
  }],
  qrCode: {
    type: String // Cloudinary URL for QR code
  },
  stock: {
    type: Number,
    required: [true, 'Please add stock quantity'],
    default: 0
  },
  sku: {
    type: String
  },
  specifications: {
    type: Map,
    of: String
  },
  rating: {
    type: Number,
    min: [0, 'Rating must be at least 0'],
    max: [5, 'Rating must can not be more than 5'],
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
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

// Create product slug from the name
productSchema.pre('save', function(next) {
  if (this.name) {
    // Ensure slug is always unique by appending timestamp and random number
    this.slug = slugify(this.name, { lower: true }) + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
  }
  
  // Auto-generate SKU if not provided to prevent duplicate key errors if index exists
  if (!this.sku) {
    this.sku = 'SKU-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
  }
  
  // Calculate discount percentage if not provided but discountPrice exists
  if (this.price && this.discountPrice && !this.discountPercentage) {
    this.discountPercentage = Math.round(((this.price - this.discountPrice) / this.price) * 100);
  }
  
  next();
});

// Virtual for thumbnail (first image)
productSchema.virtual('thumbnail').get(function() {
  if (this.images && this.images.length > 0) {
    return this.images[0];
  }
  return 'no-photo.jpg'; // Or a default placeholder
});

module.exports = mongoose.model('Product', productSchema);
