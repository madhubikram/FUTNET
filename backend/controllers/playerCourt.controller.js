// Route: /backend/controllers/playerCourt.controller.js

const Court = require('../models/court.model');
const { isWithinOperatingHours, getTimeSlots } = require('../utils/timeUtils');

const playerCourtController = {
// Export each controller function individually for better error tracking
getCourtDetails: async (req, res) => {
    try {
        const court = await Court.findById(req.params.id)
            .populate('futsalId', 'name location coordinates operatingHours')
            .populate('reviews.user', 'username');

        if (!court) {
            return res.status(404).json({ message: 'Court not found' });
        }

        // Calculate average rating but DO NOT save it back here
        // Saving here triggers validation on potentially old/invalid documents
        const calculatedAverageRating = court.calculateAverageRating();
        console.log(`[${court._id}] Calculated average rating: ${calculatedAverageRating}`);

        // Convert court document to a plain object to add the calculated rating
        const courtData = court.toObject();
        courtData.averageRating = calculatedAverageRating; 

        // Return the fetched data + calculated rating
        res.json(courtData); 
        
    } catch (error) {
        console.error(`[${req.params.id}] Error fetching court details:`, error); // Enhanced logging
        res.status(500).json({ message: `Server error fetching details: ${error.message}` }); // More informative message
    }
},

checkAvailability: async (req, res) => {
    try {
        const { date, time } = req.query;
        
        // Input validation
        if (!date || !time) {
            return res.status(400).json({ 
                message: 'Date and time are required',
                available: false
            });
        }

        // Get court details
        const court = await Court.findById(req.params.id)
            .populate('futsalId', 'operatingHours');

        if (!court) {
            return res.status(404).json({ 
                message: 'Court not found',
                available: false
            });
        }

        // Check if court is active
        if (court.status !== 'Active') {
            return res.json({
                available: false,
                rate: 0,
                message: 'Court is not active'
            });
        }

        // Check operating hours
        const isAvailable = isWithinOperatingHours(
            time,
            court.futsalId.operatingHours.opening,
            court.futsalId.operatingHours.closing
        );

        if (!isAvailable) {
            return res.json({
                available: false,
                rate: 0,
                message: 'Outside operating hours'
            });
        }

        // Check existing bookings
        let existingBooking = null;
        if (court.bookings && Array.isArray(court.bookings)) {
            existingBooking = court.bookings.find(
                booking => 
                    booking.date.toDateString() === new Date(date).toDateString() &&
                    booking.startTime === time &&
                    booking.status !== 'cancelled'
            );
        }

        // Calculate rate based on time
        let rate = court.priceHourly;
        if (court.hasPeakHours && isWithinOperatingHours(time, court.peakHours.start, court.peakHours.end)) {
            rate = court.pricePeakHours;
        } else if (court.hasOffPeakHours && isWithinOperatingHours(time, court.offPeakHours.start, court.offPeakHours.end)) {
            rate = court.priceOffPeakHours;
        }

        return res.json({
            available: !existingBooking,
            rate,
            message: existingBooking ? 'Time slot is already booked' : 'Time slot is available'
        });

    } catch (error) {
        console.error('Error checking availability:', error);
        return res.status(500).json({ 
            message: 'Error checking availability',
            error: error.message,
            available: false
        });
    }
},

addReview: async (req, res) => {
    try {
      console.log('Adding review:', {
        userId: req.user?._id,
        body: req.body
      })
      
      // Extract rating and comment, ensure comment has a default empty string
      const { rating } = req.body;
      const comment = req.body.comment || ''; // Default to empty string if comment is null/undefined
      
      // Validate rating is present and numeric
      if (!rating || isNaN(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({ message: 'Rating is required and must be between 1-5' });
      }
      
      const court = await Court.findById(req.params.id);
      if (!req.user?._id) {
        return res.status(401).json({ message: 'User not authenticated' })
      }
  
      if (!court) {
        return res.status(404).json({ message: 'Court not found' });
      }
  
      // Check if user has already reviewed
      const existingReview = court.reviews.find(
        review => review.user.toString() === req.user._id.toString()
      );
  
      if (existingReview) {
        return res.status(400).json({ message: 'You have already reviewed this court' });
      }
  
      // Add the review - comment can be empty string
      court.reviews.push({
        user: req.user._id,
        rating: Number(rating),
        comment,
        reactions: []
      });
  
      court.averageRating = court.calculateAverageRating();
      await court.save();
  
      const populatedCourt = await Court.findById(court._id)
        .populate('reviews.user', 'username')
        .populate('reviews.reactions.user', 'username');
  
      res.status(201).json(populatedCourt);
    } catch (error) {
      console.error('Error adding review:', error);
      res.status(500).json({ message: error.message });
    }
  },

  updateReview: async (req, res) => {
    try {
      const { rating, comment } = req.body;
      const court = await Court.findById(req.params.id);
  
      if (!court) {
        return res.status(404).json({ message: 'Court not found' });
      }
  
      const review = court.reviews.id(req.params.reviewId);
      
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }
  
      if (review.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this review' });
      }
  
      review.rating = rating;
      review.comment = comment;
      court.averageRating = court.calculateAverageRating();
      
      await court.save();
  
      const populatedCourt = await Court.findById(court._id)
        .populate('reviews.user', 'username')
        .populate('reviews.reactions.user', 'username');
  
      res.json(populatedCourt);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  deleteReview: async (req, res) => {
    try {
      const court = await Court.findById(req.params.id)
      if (!court) {
        return res.status(404).json({ message: 'Court not found' })
      }
  
      const review = court.reviews.id(req.params.reviewId)
      if (!review) {
        return res.status(404).json({ message: 'Review not found' })
      }
  
      if (review.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this review' })
      }
  
      // Use pull instead of remove for better compatibility
      court.reviews.pull(review)
      court.averageRating = court.calculateAverageRating()
      
      await court.save()
      
      // Return the updated court object
      const updatedCourt = await Court.findById(court._id)
        .populate('reviews.user', 'username')
        .populate('reviews.reactions.user', 'username')
      
      res.json(updatedCourt)
    } catch (error) {
      console.error('Error deleting review:', error)
      res.status(500).json({ 
        message: 'Error deleting review',
        error: error.message 
      })
    }
  },

  toggleReaction: async (req, res) => {
    try {
      const { type } = req.body;
      const court = await Court.findById(req.params.id);
  
      if (!court) {
        return res.status(404).json({ message: 'Court not found' });
      }
  
      const review = court.reviews.id(req.params.reviewId);
      
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }
  
      const existingReaction = review.reactions.find(
        reaction => reaction.user.toString() === req.user._id.toString()
      );
  
      if (existingReaction) {
        if (existingReaction.type === type) {
          // Remove reaction if same type
          review.reactions = review.reactions.filter(
            reaction => reaction.user.toString() !== req.user._id.toString()
          );
        } else {
          // Update reaction type if different
          existingReaction.type = type;
        }
      } else {
        // Add new reaction
        review.reactions.push({
          user: req.user._id,
          type
        });
      }
  
      await court.save();
  
      const populatedCourt = await Court.findById(court._id)
        .populate('reviews.user', 'username')
        .populate('reviews.reactions.user', 'username');
  
      res.json(populatedCourt);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};
// Export all controller functions
module.exports = playerCourtController;