// models/tournament.model.js
const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    registrationDeadline: {
        type: Date,
        required: true
    },
    registrationDeadlineTime: {
        type: String,
        required: true,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    halfDuration: {
        type: Number,
        required: true,
        min: 10,
        max: 45
    },
    breakDuration: {
        type: Number,
        required: true,
        min: 5,
        max: 15
    },
    format: {
        type: String,
        enum: ['single', 'double'],
        default: 'single'
    },
    minTeams: {
        type: Number,
        required: true,
        min: 4,
        max: 15,
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not an integer value for minimum teams'
        }
    },
    maxTeams: {
        type: Number,
        required: true,
        enum: [8, 16, 32]
    },
    teamSize: {
        type: Number,
        required: true,
        enum: [5, 6, 7]
    },
    substitutes: {
        type: Number,
        required: true,
        enum: [2, 3, 4]
    },
    registrationFee: {
        type: Number,
        required: true,
        min: 0
    },
    prizePool: {
        type: Number,
        min: 0,
        default: 0
    },
    prizes: {
        first: {
            type: Number,
            min: 0,
            default: 0
        },
        second: {
            type: Number,
            min: 0,
            default: 0
        },
        third: {
            type: Number,
            min: 0,
            default: 0
        }
    },
    rules: {
        type: String,
        required: true
    },
    banner: {
        type: String
    },
    status: {
        type: String,
        enum: ['Upcoming', 'Ongoing', 'Completed'],
        default: 'Upcoming'
    },
    registeredTeams: {
        type: Number,
        default: 0
    },
    futsalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Futsal',
        required: true
    }
}, {
    timestamps: true
});

tournamentSchema.pre('save', function(next) {
    console.log('[Pre-Save Hook] Calculating prize pool...');
    let totalPrize = 0;
    if (this.prizes) {
        totalPrize += Number(this.prizes.first) || 0;
        totalPrize += Number(this.prizes.second) || 0;
        totalPrize += Number(this.prizes.third) || 0;
    }
    this.prizePool = totalPrize;
    console.log(`[Pre-Save Hook] Calculated prize pool: ${this.prizePool}`);
    next();
});

tournamentSchema.methods.toJSON = function() {
    const obj = this.toObject();
    if (obj.startDate) obj.startDate = obj.startDate.toISOString().split('T')[0];
    if (obj.endDate) obj.endDate = obj.endDate.toISOString().split('T')[0];
    if (obj.registrationDeadline) obj.registrationDeadline = obj.registrationDeadline.toISOString().split('T')[0];
    
    // Ensure registrationDeadlineTime is included in response
    if (!obj.registrationDeadlineTime && obj.startTime) {
        // Fallback for older records - provide a default time 
        // (1 hour before tournament start time if on same day, or end of day if different day)
        obj.registrationDeadlineTime = obj.startTime; // Same as start time as a fallback
    }
    
    return obj;
};

module.exports = mongoose.model('Tournament', tournamentSchema);