const mongoose = require('mongoose');

const PlayboyJobApplicationSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First Name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  birthday: {
    day: {
      type: String,
      required: [true, 'Birthday Day is required']
    },
    month: {
      type: String,
      required: [true, 'Birthday Month is required']
    },
    year: {
      type: String,
      required: [true, 'Birthday Year is required']
    }
  },
  address: {
    state: {
      type: String,
      required: [true, 'State is required']
    },
    addressLine1: {
      type: String,
      required: [true, 'Address Line 1 is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    zipCode: {
      type: String,
      required: [true, 'Zip/Postal Code is required']
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'pending'
  },
  utrNumber: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('PlayboyJobApplication', PlayboyJobApplicationSchema);
