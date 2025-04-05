const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    dimensionLength: {
        type: Number,
        required: [true, 'Court length is required'],
        min: [1, 'Court length must be positive']
    },
    dimensionWidth: {
        type: Number,
        required: [true, 'Court width is required'],
        min: [1, 'Court width must be positive']
    },
    surfaceType: {
        type: String,
        required: true,
        enum: [
            'Synthetic Turf',
            'Wooden Flooring',
            'Concrete',
            'Rubber Flooring',
            'Gripper Tiles'
        ]
    },
    courtType: {
        type: String,
        enum: ['Indoor', 'Outdoor'],
        required: true
    },
    courtSide: {
        type: String,
        enum: ['5A', '7A'],
        required: true
    },
    priceHourly: {
        type: Number,
        required: true,
        min: 0
    },
    // New peak hours fields
    hasPeakHours: {
        type: Boolean,
        default: false
    },
    peakHours: {
        start: { type: String },
        end: { type: String }
    },
    pricePeakHours: {
        type: Number,
        min: 0
    },
    // New off-peak hours fields
    hasOffPeakHours: {
        type: Boolean,
        default: false
    },
    offPeakHours: {
        start: { type: String },
        end: { type: String }
    },
    priceOffPeakHours: {
        type: Number,
        min: 0
    },
    facilities: {
        changingRooms: { type: Boolean, default: false },
        lighting: { type: Boolean, default: false },
        parking: { type: Boolean, default: false },
        shower: { type: Boolean, default: false }
    },
    status: {
        type: String,
        enum: ['Active', 'Maintenance', 'Inactive'],
        default: 'Active'
    },
    images: [{
        type: String
    }],
    requirePrepayment: {
        type: Boolean,
        default: false
      },
    futsalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Futsal',
        required: true
    },
    reviews: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5
        },
        comment: {
          type: String,
          required: false,
          default: ''
        },
        createdAt: {
          type: Date,
          default: Date.now
        },
        reactions: [{
            user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
              required: true
            },
            type: {
              type: String,
              enum: ['like', 'dislike'],
              required: true
            },
            createdAt: {
              type: Date,
              default: Date.now
            }
          }]
      }],
      
      averageRating: {
        type: Number,
        default: 0
      },
}, {
    timestamps: true
});

courtSchema.methods.calculateAverageRating = function() {
    if (!this.reviews || this.reviews.length === 0) return 0; // Added check for missing reviews array
    
    // Ensure only numeric ratings are included in the sum
    const sum = this.reviews.reduce((acc, review) => {
        return acc + (typeof review?.rating === 'number' ? review.rating : 0);
    }, 0);
    
    // Avoid division by zero if somehow no valid ratings were found
    const validReviewsCount = this.reviews.filter(r => typeof r?.rating === 'number').length;
    if (validReviewsCount === 0) return 0;

    return Math.round((sum / validReviewsCount) * 10) / 10;
  };

// Validate time ranges
courtSchema.pre('save', function(next) {
    console.log('Running pre-save hook for court:', this._id); 
    try {
        // Validate Peak Hours Times if enabled
        if (this.hasPeakHours) {
            if (!this.peakHours || !this.peakHours.start || !this.peakHours.end) {
                console.error('[Validation Error] Peak hours enabled but times are missing:', this.peakHours);
                return next(new Error('Peak hours start and end times are required when peak hours are enabled.'));
            }
            // Validate Peak Price separately (it already has min: 0 validation)
            if (this.pricePeakHours === null || this.pricePeakHours === undefined) {
                 console.error('[Validation Error] Peak hours enabled but price is missing:', this.pricePeakHours);
                 return next(new Error('Peak hours price is required when peak hours are enabled.'));
            }
        }

        // Validate Off-Peak Hours Times if enabled
        if (this.hasOffPeakHours) {
            if (!this.offPeakHours || !this.offPeakHours.start || !this.offPeakHours.end) {
                 console.error('[Validation Error] Off-peak hours enabled but times are missing:', this.offPeakHours);
                 return next(new Error('Off-peak hours start and end times are required when off-peak hours are enabled.'));
            }
             // Validate Off-Peak Price separately
             if (this.priceOffPeakHours === null || this.priceOffPeakHours === undefined) {
                 console.error('[Validation Error] Off-peak hours enabled but price is missing:', this.priceOffPeakHours);
                 return next(new Error('Off-peak hours price is required when off-peak hours are enabled.'));
             }
        }

        // Validate time overlap only if both types are enabled AND times are valid strings
        if (this.hasPeakHours && this.hasOffPeakHours && 
            typeof this.peakHours?.start === 'string' && typeof this.peakHours?.end === 'string' &&
            typeof this.offPeakHours?.start === 'string' && typeof this.offPeakHours?.end === 'string') 
        {
            const timeToMinutes = (time) => {
                if (!time || !time.includes(':')) return NaN; // Handle invalid time format
                const [hours, minutes] = time.split(':').map(Number);
                if (isNaN(hours) || isNaN(minutes)) return NaN; // Handle parsing errors
                return hours * 60 + minutes;
            };

            const peakStart = timeToMinutes(this.peakHours.start);
            const peakEnd = timeToMinutes(this.peakHours.end);
            const offPeakStart = timeToMinutes(this.offPeakHours.start);
            const offPeakEnd = timeToMinutes(this.offPeakHours.end);

            // Check if any time conversion resulted in NaN
            if (isNaN(peakStart) || isNaN(peakEnd) || isNaN(offPeakStart) || isNaN(offPeakEnd)) {
                return next(new Error('Invalid time format detected in peak or off-peak hours'));
            }

            if (peakStart >= peakEnd || offPeakStart >= offPeakEnd) {
                return next(new Error('End time must be after start time for peak/off-peak hours'));
            }

            // Check for overlap: (StartA < EndB) and (EndA > StartB)
            if (peakStart < offPeakEnd && peakEnd > offPeakStart) {
                return next(new Error('Peak and off-peak hours cannot overlap'));
            }
        }

        console.log('Pre-save hook completed successfully for court:', this._id);
        next(); // Proceed with saving if all checks pass
    } catch (error) {
        console.error('Error in pre-save hook:', error);
        next(error); // Pass any unexpected errors to Mongoose
    }
});

module.exports = mongoose.model('Court', courtSchema);