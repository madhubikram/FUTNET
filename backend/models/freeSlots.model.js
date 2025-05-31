const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const FREE_SLOT_LIMIT_PER_DAY = 2; 

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

FreeSlotsSchema.index({ user: 1, court: 1, date: 1 }, { unique: true });


FreeSlotsSchema.pre('findOneAndUpdate', async function(next) {
  try {
    const update = this.getUpdate();
    
   
    if (update.$inc && update.$inc.remainingSlots < 0) {
      
      const FreeSlots = mongoose.model('FreeSlots');
      const doc = await FreeSlots.findOne(this.getQuery()).exec();
      
      if (doc) {
        
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