// models/booking.model.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  court: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Court',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  priceType: {
    type: String,
    enum: ['regular', 'peak', 'offPeak', 'free'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed', 'unpaid'],
    default: 'pending'
  },
  paymentDetails: {
    method: String,
    transactionId: String,
    paidAmount: Number,
    paidAt: Date
  },
  cancellationReason: String,
  cancellationDate: Date,
  isLoyaltyRedemption: {
    type: Boolean,
    default: false
  },
  pointsUsed: {
    type: Number,
    default: 0
  },
  isDeletedFromHistory: {
    type: Boolean,
    default: false
  },
  isSlotFree: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Add useful methods
bookingSchema.methods.cancel = async function(reason) {
    this.status = 'cancelled';
    this.cancellationReason = reason;
    this.cancellationDate = new Date();
    await this.save();
};

// Add useful statics
bookingSchema.statics.findOverlappingBookings = async function(courtId, date, startTime, endTime) {
    return this.find({
      court: courtId,
      date: date,
      status: { $ne: 'cancelled' },
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } }
      ]
    });
  };

module.exports = mongoose.model('Booking', bookingSchema);