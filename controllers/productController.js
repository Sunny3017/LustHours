const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res, next) => {
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  query = Product.find(JSON.parse(queryStr)).populate('category');

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Product.countDocuments();

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const products = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: products.length,
    pagination,
    data: products
  });
});

// @desc    Get single product
// @route   GET /api/v1/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate('category');

  if (!product) {
    return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: product
  });
});

// @desc    Get products by category
// @route   GET /api/v1/products/category/:categoryId
// @access  Public
exports.getProductsByCategory = asyncHandler(async (req, res, next) => {
  const products = await Product.find({ category: req.params.categoryId }).populate('category');

  res.status(200).json({
    success: true,
    count: products.length,
    data: products
  });
});

// @desc    Create product
// @route   POST /api/v1/products
// @access  Private (Admin)
exports.createProduct = asyncHandler(async (req, res, next) => {
  // Handle file uploads
  if (req.files) {
    // Check if files is an array (multer array) or object (multer fields)
    // Assuming we use multer.any() or fields for flexibility
    // But typically we use upload.array('images') or similar.
    // If we want to support 'qrCode' and 'images', we should check how routes are set up.
    // Assuming req.files is array of all files, we need to distinguish them by fieldname if possible.
    // But standard multer array puts everything in one list if we use .any().
    // If we use .fields([{ name: 'images', maxCount: 10 }, { name: 'qrCode', maxCount: 1 }])
    // req.files will be an object with keys 'images' and 'qrCode'.
    
    // Let's assume we update the route to use .fields()
    
    if (req.files.images) {
        const imageUrls = [];
        for (const file of req.files.images) {
            const result = await uploadToCloudinary(file.buffer, 'products');
            imageUrls.push(result.secure_url);
        }
        req.body.images = imageUrls;
    }

    if (req.files.qrCode) {
        const file = req.files.qrCode[0];
        const result = await uploadToCloudinary(file.buffer, 'products/qrcodes');
        req.body.qrCode = result.secure_url;
    }
  }

  // Fallback for single file upload middleware if not changed yet (assuming array)
  // This logic is fragile if we don't change route middleware.
  // We MUST check routes/products.js to see how upload is handled.

  // Parse specifications if it's a string (from FormData)
  if (typeof req.body.specifications === 'string') {
    try {
      req.body.specifications = JSON.parse(req.body.specifications);
    } catch (e) {
      // If parsing fails, it might be empty or invalid, let Mongoose handle validation or ignore
    }
  }

  const product = await Product.create(req.body);

  res.status(201).json({
    success: true,
    data: product
  });
});

// @desc    Update product
// @route   PUT /api/v1/products/:id
// @access  Private (Admin)
exports.updateProduct = asyncHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
  }

  // Handle file uploads
  if (req.files) {
    // Images
    if (req.files.images) {
        const imageUrls = [];
        for (const file of req.files.images) {
            const result = await uploadToCloudinary(file.buffer, 'products');
            imageUrls.push(result.secure_url);
        }
        
        let currentImages = req.body.images || product.images;
        if (typeof currentImages === 'string') {
            currentImages = [currentImages];
        } else if (!Array.isArray(currentImages)) {
            currentImages = []; // Or product.images if we want to default to keep existing
            // But if user sends nothing for 'images' field but sends new files, we usually append.
            // If user sends 'images' as array of URLs, they are keeping those.
        }
        
        // If req.body.images was not sent, we assume we keep all existing + new ones
        if (!req.body.images) {
            currentImages = product.images;
        }

        req.body.images = [...currentImages, ...imageUrls];
    }

    // QR Code
    if (req.files.qrCode) {
        const file = req.files.qrCode[0];
        const result = await uploadToCloudinary(file.buffer, 'products/qrcodes');
        req.body.qrCode = result.secure_url;
        // Delete old QR code if exists? (Optional optimization)
    }
  }

   // Parse specifications if it's a string
   if (typeof req.body.specifications === 'string') {
    try {
      req.body.specifications = JSON.parse(req.body.specifications);
    } catch (e) {
      // Ignore
    }
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: product
  });
});

// @desc    Delete product
// @route   DELETE /api/v1/products/:id
// @access  Private (Admin)
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse(`Product not found with id of ${req.params.id}`, 404));
  }

  // Delete images from Cloudinary
  if (product.images && product.images.length > 0) {
    for (const imageUrl of product.images) {
      // Extract public_id from URL
      // Example: https://res.cloudinary.com/demo/image/upload/v1570979139/ecommerce/products/sample.jpg
      const parts = imageUrl.split('/');
      const filename = parts[parts.length - 1];
      const publicId = `ecommerce/products/${filename.split('.')[0]}`;
      
      try {
        await deleteFromCloudinary(publicId);
      } catch (err) {
        console.error(`Failed to delete image ${publicId}:`, err);
      }
    }
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});
