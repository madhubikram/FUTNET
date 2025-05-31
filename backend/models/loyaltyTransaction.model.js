const mongoose = require('mongoose');

const loyaltyTransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true 
    },
    type: {
        type: String,
        enum: ['credit', 'debit'], 
        required: true
    },
    points: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    relatedBooking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: false 
    },

}, {
    timestamps: true 
});

module.exports = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema); 