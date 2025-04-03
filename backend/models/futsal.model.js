// models/futsal.model.js
const mongoose = require('mongoose');  

const futsalSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    description: {
        type: String,
        required: true
    },
    location: { 
        type: String, 
        required: true 
    },
    coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    operatingHours: {
        opening: { 
            type: String,
            required: true
        },
        closing: { 
            type: String,
            required: true
        }
    },
    facilities: [{ 
        type: String 
    }],
    pricePerHour: { 
        type: Number, 
        default: 0
    },
    owner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    rating: {
        type: Number,
        default: 0
    },
    reviews: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: Number,
        comment: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    images: [{ 
        type: String 
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Futsal', futsalSchema);