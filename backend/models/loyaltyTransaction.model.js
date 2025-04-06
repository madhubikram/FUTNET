const mongoose = require('mongoose');

const loyaltyTransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Index for faster queries by user
    },
    type: {
        type: String,
        enum: ['credit', 'debit'], // 'credit' for points awarded, 'debit' for points revoked/used
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
        required: false // Make optional, as points might be adjusted manually
    },
    // Add other potential related entities if needed (e.g., relatedReward)

}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

module.exports = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema); 