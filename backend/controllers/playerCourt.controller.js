// Route: /backend/controllers/playerCourt.controller.js

const Court = require('../models/court.model');
const Booking = require('../models/booking.model'); // Import Booking model
const User = require('../models/user.model'); // <-- Import User model
const { isWithinOperatingHours, getTimeSlots } = require('../utils/timeUtils');
const { startOfDay, endOfDay } = require('date-fns'); // Import date-fns helpers
const { createNotification } = require('../utils/notification.service'); // <-- Import notification service

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
        const FREE_SLOT_LIMIT = 2; // Define the limit for free slots

        // Input validation
        if (!date || !time) {
            return res.status(400).json({
                message: 'Date and time are required',
                available: false
            });
        }

        const requestedDate = new Date(date); // Parse the date string once

        // Get court details, including futsal's prepayment setting
        const court = await Court.findById(req.params.id)
            .populate('futsalId', 'operatingHours requirePrepayment'); // Added requirePrepayment

        if (!court || !court.futsalId) { // Check if court and populated futsalId exist
            return res.status(404).json({
                message: 'Court or associated Futsal not found',
                available: false
            });
        }

        // Check if court is active
        if (court.status !== 'Active') {
            return res.json({
                available: false,
                rate: 0,
                message: 'Court is not active',
                isFreeSlotAvailable: false
            });
        }

        // Check operating hours
        const isWithinOpHours = isWithinOperatingHours(
            time,
            court.futsalId.operatingHours.opening,
            court.futsalId.operatingHours.closing
        );

        if (!isWithinOpHours) {
            return res.json({
                available: false,
                rate: 0,
                message: 'Outside operating hours',
                isFreeSlotAvailable: false
            });
        }

        // Check existing booking for this specific slot
        const existingBooking = await Booking.findOne({
            court: court._id,
            date: {
                 $gte: startOfDay(requestedDate),
                 $lt: endOfDay(requestedDate)
            },
            startTime: time,
            status: { $ne: 'cancelled' }
        });

        if (existingBooking) {
            return res.json({
                available: false,
                rate: 0, // Rate doesn't matter if unavailable
                message: 'Time slot is already booked',
                isFreeSlotAvailable: false,
                bookedByUserId: existingBooking.user // Add the user ID here
            });
        }

        // Calculate base rate based on time
        let rate = court.priceHourly;
        let priceType = 'regular'; // Default price type
        if (court.hasPeakHours && isWithinOperatingHours(time, court.peakHours.start, court.peakHours.end)) {
            rate = court.pricePeakHours;
            priceType = 'peak';
        } else if (court.hasOffPeakHours && isWithinOperatingHours(time, court.offPeakHours.start, court.offPeakHours.end)) {
            rate = court.priceOffPeakHours;
            priceType = 'offPeak';
        }

        let isFreeSlotAvailable = false;
        // Check for free slots if prepayment is not required
        if (!court.futsalId.requirePrepayment) {
            const freeBookingCount = await Booking.countDocuments({
                // We need to find bookings associated with any court of this futsal
                // Assuming court model has futsalId populated. If not, we need to adjust.
                // Let's query courts belonging to this futsal first
                 court: { $in: await Court.find({ futsalId: court.futsalId._id }).select('_id') },
                 date: {
                     $gte: startOfDay(requestedDate),
                     $lt: endOfDay(requestedDate)
                 },
                 isSlotFree: true,
                 status: { $ne: 'cancelled' }
            });

            console.log(`[Free Slot Check] Futsal: ${court.futsalId._id}, Date: ${requestedDate.toDateString()}, Free Bookings Today: ${freeBookingCount}`);


            if (freeBookingCount < FREE_SLOT_LIMIT) {
                rate = 0;
                isFreeSlotAvailable = true;
                priceType = 'free'; // Indicate free slot price type
                console.log(`[Free Slot Check] Offering free slot for ${court.name} at ${time} on ${requestedDate.toDateString()}`);
            }
        }

        return res.json({
            available: true, // Slot is available
            rate,
            priceType, // Send price type
            message: isFreeSlotAvailable ? 'Free time slot available' : 'Time slot is available',
            isFreeSlotAvailable
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
      
      // Find the court and ensure futsalId is populated for finding the admin
      const court = await Court.findById(req.params.id).populate('futsalId');
      if (!req.user?._id) {
        return res.status(401).json({ message: 'User not authenticated' })
      }
  
      if (!court) {
        return res.status(404).json({ message: 'Court not found' });
      }
      // Add check for populated futsalId
      if (!court.futsalId) {
          console.error(`[Add Review] Court ${court._id} is missing futsalId reference.`);
          return res.status(500).json({ message: 'Internal server error: Court data incomplete.' });
      }

      // Check if user has already reviewed
      const existingReview = court.reviews.find(
        review => review.user.toString() === req.user._id.toString()
      );
  
      if (existingReview) {
        return res.status(400).json({ message: 'You have already reviewed this court' });
      }
  
      // Add the review
      const newReview = {
        user: req.user._id,
        rating: Number(rating),
        comment,
        reactions: []
      };
      court.reviews.push(newReview);
  
      court.averageRating = court.calculateAverageRating();
      await court.save();

      // --- Send Notification to Admin --- 
      try {
          const futsalAdmin = await User.findOne({ futsal: court.futsalId._id, role: 'futsalAdmin' });
          if (futsalAdmin) {
              const reviewUser = await User.findById(req.user._id);
              const userName = reviewUser ? `${reviewUser.firstName} ${reviewUser.lastName}` : 'A user';
              const ratingStars = '★'.repeat(newReview.rating) + '☆'.repeat(5 - newReview.rating);

              const adminTitle = `New Review for ${court.name}`;
              const adminMessage = `${userName} left a ${ratingStars} review: "${newReview.comment || '(No comment)'}"`;
              
              await createNotification(
                  futsalAdmin._id,
                  adminTitle,
                  adminMessage,
                  'new_review_admin',
                  `/admin/courts` // Link to admin courts page (or specific court if possible)
              );
          } else {
              console.warn(`[Notification] No futsalAdmin found for futsal ${court.futsalId._id} to notify about new review.`);
          }
      } catch (notificationError) {
          console.error('[Add Review] Failed to send admin notification:', notificationError);
      }
      // --- End Notification --- 
  
      // Repopulate after saving AND sending notification
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