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
  court: {
    type: Schema.Types.ObjectId,
    ref: 'Court',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  remainingSlots: {
    type: Number,
    default: FREE_SLOT_LIMIT_PER_DAY,
    min: 0,
    max: FREE_SLOT_LIMIT_PER_DAY
  }
}, { timestamps: true });

// Create a compound index on user and date to ensure uniqueness and fast lookups
FreeSlotsSchema.index({ user: 1, court: 1, date: 1 }, { unique: true });

// Add middleware to prevent setting negative remainingSlots values
FreeSlotsSchema.pre('findOneAndUpdate', async function(next) {
  try {
    const update = this.getUpdate();
    
    // If using $inc to decrement remainingSlots
    if (update.$inc && update.$inc.remainingSlots < 0) {
      // Get the current document to check current value
      // Use model directly instead of this.findOne to avoid "Query already executed" error
      const FreeSlots = mongoose.model('FreeSlots');
      const doc = await FreeSlots.findOne(this.getQuery()).exec();
      
      if (doc) {
        // Calculate new value after update
        const newValue = doc.remainingSlots + update.$inc.remainingSlots;
        
        // If would become negative, modify to just set to 0
        if (newValue < 0) {
          // Replace $inc with $set to set value to 0
          delete update.$inc;
          update.$set = update.$set || {};
          update.$set.remainingSlots = 0;
          console.log('[FREEMODEL] Prevented negative remainingSlots, setting to 0 instead');
        }
      }
    }
    next();
  } catch (err) {
    console.error('[FREEMODEL] Error in middleware:', err);
    next(err);
  }
});

// Export the model and the constant
module.exports = {
  FreeSlots: mongoose.model('FreeSlots', FreeSlotsSchema),
  FREE_SLOT_LIMIT_PER_DAY
}; 