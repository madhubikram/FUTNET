// backend/routes/booking.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const Booking = require('../models/booking.model');
const Court = require('../models/court.model');
const Loyalty = require('../models/loyalty.model');
const User = require('../models/user.model');
const TimeSlot = require('../models/timeSlot.model');
const { getOrCreateTimeSlot } = require('../utils/timeSlotHelper');
const { startOfDay, endOfDay } = require('date-fns');
const { isTimeInRange } = require('../utils/timeUtils'); // Assuming helper exists here
const LoyaltyTransaction = require('../models/loyaltyTransaction.model');
const moment = require('moment'); // Import moment for duration calculation

const POINTS_PER_HOUR = 10; // Define the points constant

router.post('/', auth, async (req, res) => {
    try {
        // Extract booking details from request body
        const { 
            courtId, 
            date, 
            startTime, 
            endTime, 
            userDetails,
            bookedFor = 'self', // default to self booking
            isSlotFree = false // whether this is a free slot or not
        } = req.body;

        console.log(`[Booking] Creating booking for court ${courtId}, date: ${date}, time: ${startTime}-${endTime}`);
        
        // Check if court exists
        const court = await Court.findById(courtId);
        if (!court) {
            console.log(`[Booking] Court not found: ${courtId}`);
            return res.status(404).json({ message: 'Court not found' });
        }

        // Validate date and time
        if (!date || !startTime || !endTime) {
            console.log(`[Booking] Missing date or time`);
            return res.status(400).json({ message: 'Date and time are required' });
        }

        // Format date properly - Ensure UTC midnight
        let bookingDateUTC;
        try {
            const [year, month, day] = date.split('-').map(Number);
            // Create Date object using UTC values (month is 0-indexed)
            bookingDateUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
            if (isNaN(bookingDateUTC.getTime())) {
                throw new Error('Invalid date components');
            }
        } catch (e) {
            console.error(`[Booking] Invalid date string received: ${date}`, e);
            return res.status(400).json({ message: 'Invalid date format provided. Use YYYY-MM-DD.' });
        }

        // === Use the UTC date for checks ===
        const checkStartDate = bookingDateUTC; // Already UTC midnight
        // For end check, add 1 day and subtract 1 ms, all in UTC
        const checkEndDate = new Date(bookingDateUTC.getTime() + 24 * 60 * 60 * 1000);

        // === START DEBUG LOGGING ===
        console.log(`[Booking Debug] Checking for existing bookings with params:`);
        console.log(`[Booking Debug] courtId: ${courtId}`);
        console.log(`[Booking Debug] Date Range Check: GTE=${checkStartDate.toISOString()}, LT=${checkEndDate.toISOString()}`);
        console.log(`[Booking Debug] startTime (string): ${startTime}`);
        console.log(`[Booking Debug] endTime (string): ${endTime}`);
        
        try {
            const potentiallyConflictingBookings = await Booking.find({
                court: courtId,
                date: { $gte: checkStartDate, $lt: checkEndDate } // Use date-fns range
            });
            console.log(`[Booking Debug] Found ${potentiallyConflictingBookings.length} potential conflicts for this court/date range:`);
            potentiallyConflictingBookings.forEach(b => {
                console.log(`  - ID: ${b._id}, Start: ${b.startTime}, End: ${b.endTime}, Status: ${b.status}, Date: ${b.date.toISOString()}`); // Log date too
            });
        } catch (debugError) {
            console.error("[Booking Debug] Error fetching potential conflicts:", debugError);
        }
        // === END DEBUG LOGGING ===

        // Check if slot is available (Refined Query)
        const existingBooking = await Booking.findOne({
            court: courtId,
            date: { $gte: checkStartDate, $lt: checkEndDate }, // Use date-fns range
            startTime, 
            endTime,   
            status: { $nin: ['cancelled'] }
        });

        if (existingBooking) {
            console.log(`[Booking] Found existing NON-CANCELLED booking for this exact slot: ID ${existingBooking._id}, Status ${existingBooking.status}`); // Enhanced log
            return res.status(400).json({ message: 'This time slot is already booked' });
        }

        // Get or create the time slot with proper date objects
        try {
            console.log(`[Booking] Checking for timeslot - Court: ${courtId}, Date: ${date}, Time: ${startTime}-${endTime}`);
            const timeslot = await getOrCreateTimeSlot(courtId, date, startTime, endTime);
            
            if (timeslot.isBooked) {
                console.log(`[Booking] Timeslot is already booked: ${timeslot._id}`);
                return res.status(400).json({ message: 'This timeslot is already booked' });
            }
            
            console.log(`[Booking] Timeslot is available: ${timeslot._id}, isBooked: ${timeslot.isBooked}`);
            
            // ---- Start: Corrected Price/Type Logic ----
            let price = court.priceHourly; 
            let determinedPriceType = 'regular'; 

            // Determine base price and type based on time
            if (court.hasPeakHours && isTimeInRange(startTime, court.peakHours.start, court.peakHours.end)) {
                price = court.pricePeakHours;
                determinedPriceType = 'peak';
            } else if (court.hasOffPeakHours && isTimeInRange(startTime, court.offPeakHours.start, court.offPeakHours.end)) {
                price = court.priceOffPeakHours;
                determinedPriceType = 'offPeak';
            }
            
            let finalPrice = price; // Initialize final price with calculated rate
            let finalPriceType = determinedPriceType; // Initialize final type
            let durationInHours = 1; // Default duration

            // Adjust if it's a free slot
            if (isSlotFree) {
                finalPriceType = 'free'; // Set type to free, keep calculated price
                
                // Calculate duration for user count update
                try {
                    const start = new Date(`1970-01-01T${startTime}:00Z`);
                    const end = new Date(`1970-01-01T${endTime}:00Z`);
                    const durationInMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
                    if (durationInMinutes > 0) {
                        durationInHours = Math.round(durationInMinutes / 60); 
                    }
                } catch (e) {
                    console.error("[Booking Duration Calc] Error calculating duration:", e); 
                }
                console.log(`[Booking] Calculated duration for free slot: ${durationInHours} hour(s)`);
                
                // Update user's free booking count
                const user = await User.findById(req.user._id);
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }
                if (typeof user.freeBookingsUsed !== 'number') {
                    user.freeBookingsUsed = 0;
                }
                user.freeBookingsUsed += durationInHours; 
                await user.save();
                console.log(`User ${user._id} used ${durationInHours} free slot(s). Total used: ${user.freeBookingsUsed}`);
            }
            // ---- End: Corrected Price/Type Logic ----
            
            // --- Use the CORRECT UTC midnight date for saving ---
            // const bookingDateStartOfDay = startOfDay(bookingDate); // REMOVE THIS
            
            // Create new booking with determined price and priceType
            const newBooking = new Booking({
                court: courtId,
                user: req.user._id,
                date: bookingDateUTC, // <-- SAVE THE UTC MIDNIGHT DATE
                startTime,
                endTime,
                price: finalPrice, // Use the final price (could be regular/peak/offPeak)
                priceType: finalPriceType, // Use the final type (could be regular/peak/offPeak/free)
                bookedBy: req.user.name,
                contactEmail: req.user.email,
                contactNumber: req.user.phone || userDetails?.phone || 'No Phone Provided',
                userName: userDetails?.name || req.user.name,
                phone: userDetails?.phone || req.user.phone || 'No Phone Provided',
                email: userDetails?.email || req.user.email,
                status: isSlotFree ? 'confirmed' : 'pending',
                paymentStatus: 'pending',
                bookedFor,
                isSlotFree: isSlotFree
            });

            // Save the booking
            const savedBooking = await newBooking.save();

            // Update timeslot to mark as booked and link to the booking
            timeslot.isBooked = true;
            timeslot.bookedBy = savedBooking.user; 
            timeslot.booking = savedBooking._id; 
            await timeslot.save();
            console.log(`[Booking] Timeslot ${timeslot._id} updated: isBooked=true, booking=${timeslot.booking}`);

            // Loyalty points are awarded ONLY when admin marks payment as 'paid'
            // The logic for this is in the PATCH /admin/:id/status route

            res.status(201).json(savedBooking);
        } catch (timeSlotError) {
            console.error('Error with timeslot:', timeSlotError);
            return res.status(500).json({ 
                message: 'Failed to process time slot', 
                error: timeSlotError.message 
            });
        }
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({
            message: 'Failed to create booking',
            error: error.message
        });
    }
});

router.get('/', auth, async (req, res) => {
    try {
      // Get bookings with court details populated
      const bookings = await Booking.find({ 
        user: req.user._id,
        isDeletedFromHistory: { $ne: true } // Exclude deleted bookings
      })
        .populate({
          path: 'court',
          select: 'name futsalId surfaceType courtType images', // Make sure images is included
          populate: {
            path: 'futsalId',
            select: 'name'
          }
        })
        .sort({ date: 1, startTime: 1 });
      
      // Transform the bookings for the frontend
      const transformedBookings = bookings.map(booking => {
        const bookingObj = booking.toObject();
        
        // Add court and futsal details in an easier-to-access format
        bookingObj.courtDetails = {
          name: booking.court?.name || 'Unknown Court',
          futsalName: booking.court?.futsalId?.name || 'Unknown Futsal',
          surfaceType: booking.court?.surfaceType || 'Unknown',
          courtType: booking.court?.courtType || 'Unknown',
          images: booking.court?.images || [] // Make sure images is included
        };
        
        // Check if this was a free booking
        if (booking.paymentStatus === 'unpaid') {
          bookingObj.paymentDetails = {
            ...bookingObj.paymentDetails,
            method: 'free'
          };
        }
        
        return bookingObj;
      });
      
      res.json(transformedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({
        message: 'Failed to fetch bookings',
        error: error.message
      });
    }
  });

  router.get('/stats', auth, async (req, res) => {
    try {
      // Count all bookings
      const totalCount = await Booking.countDocuments({ 
        user: req.user._id 
      });
      
      // Count confirmed bookings
      const confirmedCount = await Booking.countDocuments({ 
        user: req.user._id,
        status: 'confirmed'
      });
      
      // Count confirmed paid bookings (excluding free bookings)
      const confirmedPaidCount = await Booking.countDocuments({ 
        user: req.user._id,
        status: 'confirmed',
        $or: [
          { 'paymentStatus': { $ne: 'unpaid' } },
          { 'paymentStatus': { $exists: false } }
        ]
      });
      
      // Count completed bookings
      const completedCount = await Booking.countDocuments({ 
        user: req.user._id,
        status: 'completed'
      });
      
      res.json({
        totalCount,
        confirmedCount,
        confirmedPaidCount,
        completedCount
      });
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      res.status(500).json({
        message: 'Failed to fetch booking statistics',
        error: error.message
      });
    }
  });

  router.get('/free-slots', auth, async (req, res) => {
    try {
      const userId = req.user._id;
      const { date } = req.query; // Get the date from query parameters
      const freeSlotLimit = 2; // Limit is per hour-slot

      let totalFreeHoursUsedToday = 0;
      if (date) {
          let requestedDate;
          try {
            requestedDate = new Date(date);
            if (isNaN(requestedDate.getTime())) {
              throw new Error('Invalid date format');
            }
          } catch (e) {
            return res.status(400).json({ message: 'Invalid date format provided for free slot check' });
          }

          const startDate = startOfDay(requestedDate);
          const endDate = endOfDay(requestedDate);
          
          // Fetch free bookings for the user on the specific date
          const freeBookingsToday = await Booking.find({
              user: userId,
              isSlotFree: true,
              status: { $ne: 'cancelled' }, 
              date: { 
                  $gte: startDate, 
                  $lt: endDate 
              }
          });

          // Calculate total duration in hours
          totalFreeHoursUsedToday = freeBookingsToday.reduce((totalHours, booking) => {
               let durationInHours = 1; // Default to 1 hour per booking record
               try {
                    const start = new Date(`1970-01-01T${booking.startTime}:00Z`);
                    const end = new Date(`1970-01-01T${booking.endTime}:00Z`);
                    const durationInMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
                    if (durationInMinutes > 0) {
                        durationInHours = Math.round(durationInMinutes / 60); 
                    }
               } catch(e) { /* Ignore calculation error, use default */ }
               return totalHours + durationInHours;
          }, 0);

          console.log(`[Free Slots Check] User ${userId} used ${totalFreeHoursUsedToday} free hours on ${date}`);
      } else {
          console.log(`[Free Slots Check] No date provided, returning default values.`);
      }

      const freeBookingsRemainingToday = Math.max(0, freeSlotLimit - totalFreeHoursUsedToday);
      
      res.json({
        freeSlotLimit, 
        freeBookingsUsedToday: totalFreeHoursUsedToday, // Send total hours used
        freeBookingsRemainingToday // Remaining slots based on hours
      });

    } catch (error) {
      console.error('Error checking free slots:', error);
      res.status(500).json({
        message: 'Failed to check free slots',
        error: error.message
      });
    }
  });

  router.patch('/:id/cancel', auth, async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Check if the booking belongs to the user
      if (booking.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to cancel this booking' });
      }
      
      // Check if booking can be cancelled (only pending or confirmed bookings)
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({ message: `Cannot cancel a booking with status: ${booking.status}` });
      }
      
      // --- Cancellation Logging START ---
      console.log(`[Cancel Debug] Booking ID: ${booking._id}, Current Status: ${booking.status}`);
      // --- Cancellation Logging END ---
      
      // Update booking status
      booking.status = 'cancelled';
      booking.cancellationReason = req.body.reason || 'User cancelled';
      booking.cancellationDate = new Date();
      
      // --- Cancellation Logging START ---
      console.log(`[Cancel Debug] Booking ID: ${booking._id}, Status AFTER update (before save): ${booking.status}`);
      // --- Cancellation Logging END ---

      await booking.save();
      
      console.log(`[Cancel Debug] Booking ID: ${booking._id} saved with status: ${booking.status}`);

      // Make the corresponding timeslot available again using the booking ID
      try {
        console.log(`[User Cancel] Finding TimeSlot linked to Booking: ${booking._id}`);
        const timeslot = await TimeSlot.findOne({ booking: booking._id });

        if (timeslot) {
            console.log(`[User Cancel] Found timeslot ${timeslot._id}. Current isBooked: ${timeslot.isBooked}`);
            if (timeslot.isBooked) {
                timeslot.isBooked = false;
                timeslot.bookedBy = null;
                timeslot.booking = null; // Unlink the booking
                await timeslot.save();
                console.log(`[User Cancel] Timeslot ${timeslot._id} marked as available. New isBooked: ${timeslot.isBooked}`);
            } else {
                 console.log(`[User Cancel] Timeslot ${timeslot._id} was already available.`);
            }
        } else {
            // This might happen if the timeslot wasn't correctly linked initially
            console.warn(`[User Cancel] Could not find TimeSlot document linked to booking ${booking._id}. Attempting fallback find...`);
            // Fallback: Try finding by court/time (less reliable)
            const bookingDateForSlot = startOfDay(booking.date);
            const [startHour, startMinute] = booking.startTime.split(':').map(Number);
            const exactStartTime = new Date(Date.UTC(bookingDateForSlot.getUTCFullYear(), bookingDateForSlot.getUTCMonth(), bookingDateForSlot.getUTCDate(), startHour, startMinute));
            const fallbackTimeslot = await TimeSlot.findOne({ court: booking.court, startTime: exactStartTime });
            if (fallbackTimeslot) {
                 console.warn(`[User Cancel Fallback] Found timeslot ${fallbackTimeslot._id}. Updating.`);
                 fallbackTimeslot.isBooked = false;
                 fallbackTimeslot.bookedBy = null;
                 fallbackTimeslot.booking = null;
                 await fallbackTimeslot.save();
            } else {
                 console.error(`[User Cancel Fallback] Still could not find timeslot for booking ${booking._id}.`);
            }
        }
      } catch (timeSlotError) {
        console.error('[User Cancel] Error updating timeslot after cancellation:', timeSlotError);
      }
      
      // If it was a free booking, correctly calculate duration and decrement user's count
      if (booking.isSlotFree) { 
        let durationInHours = 1; // Default
        try {
            const start = new Date(`1970-01-01T${booking.startTime}:00Z`);
            const end = new Date(`1970-01-01T${booking.endTime}:00Z`);
            const durationInMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
            if (durationInMinutes > 0) {
                durationInHours = Math.round(durationInMinutes / 60);
            }
        } catch(e) { console.error("[Cancel Refund Calc] Error:", e); }

        const user = await User.findById(req.user._id);
        if (user && typeof user.freeBookingsUsed === 'number' && user.freeBookingsUsed > 0) {
          // Ensure count doesn't go below zero
          user.freeBookingsUsed = Math.max(0, user.freeBookingsUsed - durationInHours); 
          await user.save();
          console.log(`User ${user._id} free slot count decremented by ${durationInHours} after cancellation. Total used: ${user.freeBookingsUsed}`);
        } else if (user) {
             console.log(`User ${user._id} free slot usage was already 0 or undefined.`);
        } else {
             console.warn(`Could not find user ${req.user._id} to refund free slot.`);
        }
      }
      
      res.json(booking);
      
    } catch (error) {
      console.error('Error cancelling booking:', error);
      res.status(500).json({
        message: 'Failed to cancel booking',
        error: error.message
      });
    }
  });

  // Post variant for cancel (Apply same fix)
  router.post('/:id/cancel', auth, async (req, res) => {
     try {
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Check if the booking belongs to the user
      if (booking.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to cancel this booking' });
      }
      
      // Check if booking can be cancelled (only pending or confirmed bookings)
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({ message: `Cannot cancel a booking with status: ${booking.status}` });
      }
      
      // --- Cancellation Logging START ---
      console.log(`[Cancel Debug] Booking ID: ${booking._id}, Current Status: ${booking.status}`);
      // --- Cancellation Logging END ---
      
      // Update booking status
      booking.status = 'cancelled';
      booking.cancellationReason = req.body.reason || 'User cancelled';
      booking.cancellationDate = new Date();
      
      // --- Cancellation Logging START ---
      console.log(`[Cancel Debug] Booking ID: ${booking._id}, Status AFTER update (before save): ${booking.status}`);
      // --- Cancellation Logging END ---

      await booking.save();
      
      console.log(`[Cancel Debug] Booking ID: ${booking._id} saved with status: ${booking.status}`);

      // Make the corresponding timeslot available again using the booking ID
      try {
        console.log(`[User Cancel POST] Finding TimeSlot linked to Booking: ${booking._id}`);
        const timeslot = await TimeSlot.findOne({ booking: booking._id });

        if (timeslot) {
            console.log(`[User Cancel POST] Found timeslot ${timeslot._id}. Current isBooked: ${timeslot.isBooked}`);
             if (timeslot.isBooked) {
                timeslot.isBooked = false;
                timeslot.bookedBy = null;
                timeslot.booking = null; // Unlink the booking
                await timeslot.save();
                console.log(`[User Cancel POST] Timeslot ${timeslot._id} marked as available. New isBooked: ${timeslot.isBooked}`);
             } else {
                 console.log(`[User Cancel POST] Timeslot ${timeslot._id} was already available.`);
             }
        } else {
            console.warn(`[User Cancel POST] Could not find TimeSlot document linked to booking ${booking._id}. Attempting fallback find...`);
            // Fallback logic (same as above)
            const bookingDateForSlot = startOfDay(booking.date);
            const [startHour, startMinute] = booking.startTime.split(':').map(Number);
            const exactStartTime = new Date(Date.UTC(bookingDateForSlot.getUTCFullYear(), bookingDateForSlot.getUTCMonth(), bookingDateForSlot.getUTCDate(), startHour, startMinute));
            const fallbackTimeslot = await TimeSlot.findOne({ court: booking.court, startTime: exactStartTime });
            if (fallbackTimeslot) {
                 console.warn(`[User Cancel POST Fallback] Found timeslot ${fallbackTimeslot._id}. Updating.`);
                 fallbackTimeslot.isBooked = false;
                 fallbackTimeslot.bookedBy = null;
                 fallbackTimeslot.booking = null;
                 await fallbackTimeslot.save();
            } else {
                 console.error(`[User Cancel POST Fallback] Still could not find timeslot for booking ${booking._id}.`);
            }
        }
      } catch (timeSlotError) {
        console.error('[User Cancel POST] Error updating timeslot after cancellation:', timeSlotError);
      }
      
      // If it was a free booking, correctly calculate duration and decrement user's count
      if (booking.isSlotFree) { 
        let durationInHours = 1; // Default
        try {
            const start = new Date(`1970-01-01T${booking.startTime}:00Z`);
            const end = new Date(`1970-01-01T${booking.endTime}:00Z`);
            const durationInMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
            if (durationInMinutes > 0) {
                durationInHours = Math.round(durationInMinutes / 60);
            }
        } catch(e) { console.error("[Cancel Refund Calc] Error:", e); }

        const user = await User.findById(req.user._id);
        if (user && typeof user.freeBookingsUsed === 'number' && user.freeBookingsUsed > 0) {
            user.freeBookingsUsed = Math.max(0, user.freeBookingsUsed - durationInHours);
            await user.save();
            console.log(`User ${user._id} free slot count decremented by ${durationInHours} after cancellation. Total used: ${user.freeBookingsUsed}`);
        } else if (user) {
            console.log(`User ${user._id} free slot usage was already 0 or undefined.`);
        } else {
            console.warn(`Could not find user ${req.user._id} to refund free slot.`);
        }
      }
      
      res.json(booking);
      
    } catch (error) {
      console.error('Error cancelling booking:', error);
      res.status(500).json({
        message: 'Failed to cancel booking',
        error: error.message
      });
    }
  });

  // Delete booking from user history
  router.post('/:id/delete', auth, async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Check if the booking belongs to the user
      if (booking.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this booking' });
      }
      
      // Check if booking can be deleted (only completed or cancelled bookings)
      if (!['completed', 'cancelled'].includes(booking.status)) {
        return res.status(400).json({ message: `Cannot delete a booking with status: ${booking.status}` });
      }
      
      // Mark booking as deleted from user history
      booking.isDeletedFromHistory = true;
      await booking.save();
      
      res.json({
        message: 'Booking deleted from history',
        bookingId: booking._id
      });
      
    } catch (error) {
      console.error('Error deleting booking history:', error);
      res.status(500).json({
        message: 'Failed to delete booking history',
        error: error.message
      });
    }
  });

  // Admin Routes
  // Get all bookings with filters (admin only)
  router.get('/admin', auth, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'futsalAdmin' && req.user.role !== 'superAdmin') {
        return res.status(403).json({ message: 'Unauthorized: Admin access required' });
      }
      
      // Build query with filters
      const query = {};
      
      // For futsal admins, only show bookings for their own futsal
      if (req.user.role === 'futsalAdmin' && req.user.futsal) {
        // Find all courts belonging to this futsal
        const futsalId = req.user.futsal._id;
        const Court = require('../models/court.model');
        const courts = await Court.find({ futsalId });
        const courtIds = courts.map(court => court._id);
        
        // Only show bookings for these courts
        query.court = { $in: courtIds };
      }
      
      // Date range filter
      if (req.query.startDate && req.query.endDate) {
        query.date = {
          $gte: new Date(req.query.startDate),
          $lte: new Date(req.query.endDate)
        };
      } else if (req.query.startDate) {
        query.date = { $gte: new Date(req.query.startDate) };
      } else if (req.query.endDate) {
        query.date = { $lte: new Date(req.query.endDate) };
      }
      
      // Status filter
      if (req.query.status && req.query.status !== 'all') {
        query.status = req.query.status;
      }
      
      // Payment status filter
      if (req.query.paymentStatus && req.query.paymentStatus !== 'all') {
        query.paymentStatus = req.query.paymentStatus;
      }
      
      // Court filter
      if (req.query.courtId) {
        query.court = req.query.courtId;
      }
      
      // Get bookings with full details
      const bookings = await Booking.find(query)
        .populate({
          path: 'court',
          select: 'name futsalId surfaceType courtType images',
          populate: {
            path: 'futsalId',
            select: 'name'
          }
        })
        .populate({
          path: 'user',
          select: 'firstName lastName email contactNumber username'
        })
        .sort({ date: -1, startTime: 1 });
      
      // Transform bookings for frontend
      const transformedBookings = bookings.map(booking => {
        const bookingObj = booking.toObject();
        
        // Add formatted data for easier frontend display
        // bookingObj.formattedDate = booking.date.toLocaleDateString();
        
        // Add court details
        bookingObj.courtDetails = {
          name: booking.court?.name || 'Unknown Court',
          futsalName: booking.court?.futsalId?.name || 'Unknown Futsal',
          surfaceType: booking.court?.surfaceType || 'Unknown',
          courtType: booking.court?.courtType || 'Unknown',
          images: booking.court?.images || []
        };
        
        // Add user details with proper fallbacks from direct booking data
        bookingObj.userInfo = {
          name: `${booking.user?.firstName || '' } ${booking.user?.lastName || ''}` . trim() || booking.userName || 'Guest User',
          email: booking.user?.email || booking.email || 'No Email Provided', 
          phone: booking.user?.contactNumber || booking.phone || 'No Phone Provided', 
          username: booking.user?.username || booking.userName || 'No Username Provided'
      };
        
        return bookingObj;
      });
      
      res.json(transformedBookings);
    } catch (error) {
      console.error('Error fetching admin bookings:', error);
      res.status(500).json({
        message: 'Failed to fetch bookings',
        error: error.message
      });
    }
  });

  // Helper function to calculate duration in hours (handle potential errors)
  const calculateDurationHours = (startTime, endTime) => {
    try {
      // Assuming startTime and endTime are in HH:mm format
      const start = moment(startTime, 'HH:mm');
      const end = moment(endTime, 'HH:mm');

      // Handle cases where endTime is on the next day (e.g., 23:00 to 01:00)
      if (end.isBefore(start)) {
          end.add(1, 'day');
      }

      const duration = moment.duration(end.diff(start));
      const hours = duration.asHours();
      
      // Basic validation for calculated hours
      if (isNaN(hours) || hours <= 0) {
        console.error(`Invalid duration calculated: ${hours} hours for ${startTime} - ${endTime}`);
        return 0; // Return 0 or throw error based on desired handling
      }
      
      return hours;
    } catch (error) {
        console.error('Error calculating duration:', error);
        return 0; // Return 0 on error
    }
  };

  // Admin: Update Booking Payment Status
  router.patch('/admin/:id/payment', auth, async (req, res) => {
    const { paymentStatus } = req.body;
    const bookingId = req.params.id;
    const adminUserId = req.user._id;

    if (!paymentStatus || !['pending', 'paid', 'refunded', 'failed', 'unpaid'].includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid payment status provided.' });
    }

    try {
        const booking = await Booking.findById(bookingId).populate('user', 'loyalty');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        const oldStatus = booking.paymentStatus;
        const newStatus = paymentStatus;

        // Prevent redundant updates
        if (oldStatus === newStatus) {
            return res.status(200).json({ message: 'Payment status is already set to ' + newStatus, booking });
        }

        // Update booking status and potentially payment details
        booking.paymentStatus = newStatus;
        if (newStatus === 'paid') {
            booking.paymentDetails = {
                method: booking.paymentDetails?.method || 'offline', // Keep existing method or default to offline
                transactionId: booking.paymentDetails?.transactionId || `ADMIN-PAY-${Date.now()}`,
                paidAmount: booking.price, // Assume full price paid when admin marks paid
                paidAt: new Date()
            };
        }

        // --- Loyalty Points Logic ---
        let loyaltyUpdate = null;
        let transactionType = null;
        let pointsChange = 0;
        let loyaltyLogMessage = null;

        if (newStatus === 'paid') {
            // Award points for ANY booking marked as paid
            const durationHours = calculateDurationHours(booking.startTime, booking.endTime);
            pointsChange = Math.round(durationHours * POINTS_PER_HOUR); // Use defined constant
            transactionType = 'credit';
            loyaltyLogMessage = `Awarded ${pointsChange} points`;

            // Find or create loyalty record - RESOLVED CONFLICT
            loyaltyUpdate = await Loyalty.findOneAndUpdate(
                { user: booking.user._id },
                {
                    $inc: { points: pointsChange }, // Increments points if doc exists, sets to pointsChange if inserting
                    $setOnInsert: { user: booking.user._id } // Only set user field on insert
                },
                { upsert: true, new: true }
            );

        } else if (oldStatus === 'paid' && newStatus === 'unpaid') {
            // Revoke points only if changing from paid to unpaid
            const durationHours = calculateDurationHours(booking.startTime, booking.endTime);
            pointsChange = Math.round(durationHours * POINTS_PER_HOUR); // Use defined constant
            transactionType = 'debit';
            loyaltyLogMessage = `Revoked ${pointsChange} points`;

            // Find loyalty record
            const loyalty = await Loyalty.findOne({ user: booking.user._id });
            if (loyalty) {
                // Correctly decrease points, ensuring it doesn't go below 0
                loyalty.points = Math.max(0, loyalty.points - pointsChange);
                loyaltyUpdate = await loyalty.save(); // Save the updated loyalty document
            } else {
                loyaltyLogMessage += ' (User has no loyalty record)';
            }
        }

        // Save the booking changes
        const updatedBooking = await booking.save();

        // Log Loyalty Transaction if points changed
        if (loyaltyUpdate && transactionType && pointsChange > 0) {
            console.log(`[Loyalty] ${loyaltyLogMessage} to user ${booking.user._id} for booking ${bookingId}`);
            await LoyaltyTransaction.create({
                user: booking.user._id,
                type: transactionType,
                points: pointsChange,
                reason: `Booking ${bookingId} status changed to ${newStatus} by admin ${adminUserId}`,
                relatedBooking: bookingId
            });
        } else if (transactionType && pointsChange > 0) {
             console.log(`[Loyalty] ${loyaltyLogMessage} for user ${booking.user._id} booking ${bookingId}`); // Log even if loyalty doc didn't exist for revoke
        }

        res.status(200).json({ message: `Booking payment status updated to ${newStatus}`, booking: updatedBooking });

    } catch (error) {
        console.error(`Error updating booking ${bookingId} payment status to ${paymentStatus}:`, error);
        // Log the specific loyalty error if it occurred during the revoke attempt
        if (error.message.includes('loyalty.save')) { 
             console.error(`[Loyalty] Error saving loyalty update for booking ${bookingId}:`, error);
        }
        res.status(500).json({ message: 'Failed to update booking payment status.' });
    }
  });

  // Reschedule booking (admin only)
  router.patch('/admin/:id/reschedule', auth, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'futsalAdmin' && req.user.role !== 'superAdmin') {
        return res.status(403).json({ message: 'Unauthorized: Admin access required' });
      }
      
      const { date, startTime, endTime } = req.body;
      
      if (!date || !startTime || !endTime) {
        return res.status(400).json({ message: 'Date, start time, and end time are required' });
      }
      
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Check for overlapping bookings
      const overlappingBookings = await Booking.findOverlappingBookings(
        booking.court,
        new Date(date),
        startTime,
        endTime
      );
      
      // Filter out current booking from overlapping results
      const otherOverlappingBookings = overlappingBookings.filter(
        b => b._id.toString() !== booking._id.toString()
      );
      
      if (otherOverlappingBookings.length > 0) {
        return res.status(400).json({ 
          message: 'This time slot is already booked',
          conflictingBookings: otherOverlappingBookings
        });
      }
      
      // Update booking time
      booking.date = new Date(date);
      booking.startTime = startTime;
      booking.endTime = endTime;
      
      await booking.save();
      
      res.json({
        message: 'Booking rescheduled successfully',
        booking
      });
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      res.status(500).json({
        message: 'Failed to reschedule booking',
        error: error.message
      });
    }
  });

  // Delete booking (admin only)
  router.delete('/admin/:id', auth, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'futsalAdmin' && req.user.role !== 'superAdmin') {
        return res.status(403).json({ message: 'Unauthorized: Admin access required' });
      }

      const bookingId = req.params.id;
      
      // For futsal admins, only allow deleting bookings for their own futsal
      if (req.user.role === 'futsalAdmin') {
        const booking = await Booking.findById(bookingId).populate('court');
        
        if (!booking) {
          return res.status(404).json({ message: 'Booking not found' });
        }
        
        // Check if booking belongs to admin's futsal
        if (booking.court && booking.court.futsalId) {
          const bookingFutsalId = booking.court.futsalId.toString();
          const adminFutsalId = req.user.futsal._id.toString();
          
          if (bookingFutsalId !== adminFutsalId) {
            return res.status(403).json({ 
              message: 'Unauthorized: You can only delete bookings for your own futsal' 
            });
          }
        }
      }
      
      // Delete the booking
      const deletedBooking = await Booking.findByIdAndDelete(bookingId);
      
      if (!deletedBooking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      res.json({ message: 'Booking successfully deleted', bookingId });
    } catch (error) {
      console.error('Error deleting booking:', error);
      res.status(500).json({
        message: 'Failed to delete booking',
        error: error.message
      });
    }
  });

  // --- BULK ACTIONS (ADMIN ONLY) --- 

  // Bulk update payment status
  router.patch('/admin/bulk-status', auth, async (req, res) => {
    if (req.user.role !== 'futsalAdmin' && req.user.role !== 'superAdmin') {
        return res.status(403).json({ message: 'Unauthorized' });
    }
    const { ids, paymentStatus, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Booking IDs must be provided as an array.' });
    }
    if (paymentStatus && !['pending', 'paid', 'refunded', 'failed'].includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid paymentStatus provided.' });
    }
     if (status && !['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
        return res.status(400).json({ message: 'Invalid booking status provided.' });
    }

    try {
        const updateData = {};
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (status) updateData.status = status;

        if (Object.keys(updateData).length === 0) {
             return res.status(400).json({ message: 'No valid status to update provided.' });
        }

        // Add logic to award points if setting paymentStatus to 'paid'
        if (paymentStatus === 'paid') {
            updateData['paymentDetails.paidAt'] = new Date(); 
            updateData['paymentDetails.method'] = 'offline-bulk';
        }
        
        const result = await Booking.updateMany(
            { _id: { $in: ids } }, // Can add futsal check here later if needed
            { $set: updateData }
        );

        // TODO: Optionally award loyalty points here for bookings marked as 'paid' 
        // (Requires fetching the bookings first to get user ID and price)

        res.json({ message: `Successfully updated ${result.modifiedCount} bookings.`, updatedCount: result.modifiedCount });
    } catch (error) {
        console.error('Bulk Status Update Error:', error);
        res.status(500).json({ message: 'Failed to update booking statuses.', error: error.message });
    }
  });

  // Bulk cancel bookings
  router.patch('/admin/bulk-cancel', auth, async (req, res) => {
     if (req.user.role !== 'futsalAdmin' && req.user.role !== 'superAdmin') {
        return res.status(403).json({ message: 'Unauthorized' });
    }
    const { ids } = req.body;
     if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Booking IDs must be provided as an array.' });
    }

    try {
        const bookingsToCancel = await Booking.find({
             _id: { $in: ids },
             status: { $in: ['pending', 'confirmed'] } // Only cancel pending/confirmed
        });

        if (bookingsToCancel.length === 0) {
            return res.status(400).json({ message: 'No valid bookings found to cancel.' });
        }

        const cancelledIds = bookingsToCancel.map(b => b._id);
        const cancellationReason = 'Bulk cancelled by admin';
        const cancellationDate = new Date();

        // Update Booking statuses
        await Booking.updateMany(
            { _id: { $in: cancelledIds } },
            { $set: { status: 'cancelled', cancellationReason, cancellationDate } }
        );

        // Update TimeSlots
        for (const booking of bookingsToCancel) {
            try {
                const timeslot = await TimeSlot.findOne({ booking: booking._id });
                if (timeslot && timeslot.isBooked) {
                    timeslot.isBooked = false;
                    timeslot.bookedBy = null;
                    timeslot.booking = null;
                    await timeslot.save();
                } else if (!timeslot) {
                     console.warn(`[Bulk Cancel] No TimeSlot found for booking ${booking._id}`);
                }
            } catch (tsError) {
                 console.error(`[Bulk Cancel] Error updating TimeSlot for booking ${booking._id}:`, tsError);
            }
            // TODO: Optionally refund free slots used?
        }

        res.json({ message: `Successfully cancelled ${cancelledIds.length} bookings.`, updatedCount: cancelledIds.length });
    } catch (error) {
         console.error('Bulk Cancel Error:', error);
        res.status(500).json({ message: 'Failed to cancel bookings.', error: error.message });
    }
  });

  // Bulk delete bookings (Using POST for safety with ID list)
  router.post('/admin/bulk-delete', auth, async (req, res) => {
     if (req.user.role !== 'futsalAdmin' && req.user.role !== 'superAdmin') {
        return res.status(403).json({ message: 'Unauthorized' });
    }
    const { ids } = req.body;
     if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Booking IDs must be provided as an array.' });
    }

    try {
        // Find corresponding timeslots first
        const timeslotsToDelete = await TimeSlot.find({ booking: { $in: ids } });

        // Delete bookings
        const deleteResult = await Booking.deleteMany({ _id: { $in: ids } });

        // Delete associated timeslots
        if (timeslotsToDelete.length > 0) {
            const timeslotIds = timeslotsToDelete.map(ts => ts._id);
            await TimeSlot.deleteMany({ _id: { $in: timeslotIds } });
            console.log(`[Bulk Delete] Deleted ${timeslotIds.length} associated TimeSlots.`);
        }

        res.json({ message: `Successfully deleted ${deleteResult.deletedCount} bookings and associated timeslots.`, deletedCount: deleteResult.deletedCount });
    } catch (error) {
         console.error('Bulk Delete Error:', error);
        res.status(500).json({ message: 'Failed to delete bookings.', error: error.message });
    }
  });

module.exports = router;