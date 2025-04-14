const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define constant for max free slots per day
const FREE_SLOT_LIMIT_PER_DAY = 2; // Each user gets 2 free slots per day by default

// Schema definition
const FreeSlotsSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  slotsRemaining: {
    type: Number,
    default: FREE_SLOT_LIMIT_PER_DAY,
    min: 0,
    max: FREE_SLOT_LIMIT_PER_DAY
  }
}, { timestamps: true });

// Create a compound index on user and date to ensure uniqueness and fast lookups
FreeSlotsSchema.index({ user: 1, date: 1 }, { unique: true });

// Export the model and the constant
module.exports = {
  FreeSlots: mongoose.model('FreeSlots', FreeSlotsSchema),
  FREE_SLOT_LIMIT_PER_DAY
}; 