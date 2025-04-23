// backend/controllers/bookingController.js
const mongoose = require('mongoose');
const Booking = require('../models/booking.model');
const Court = require('../models/court.model');
const Loyalty = require('../models/loyalty.model');
const User = require('../models/user.model');
const TimeSlot = require('../models/timeSlot.model');
const { getOrCreateTimeSlot } = require('../utils/timeSlotHelper');
const { startOfDay, endOfDay } = require('date-fns');
const log = require('../utils/khalti.service').log; // Assuming shared logger
const { createNotification } = require('../utils/notification.service');
const { isTimeInRange } = require('../utils/timeUtils');
const LoyaltyTransaction = require('../models/loyaltyTransaction.model');
const { initiatePaymentFlow } = require('./payment.controller'); // Correct path if in same dir, adjust if needed
const { FreeSlots, FREE_SLOT_LIMIT_PER_DAY } = require('../models/freeSlots.model');

const POINTS_PER_HOUR = 10; // Example value, adjust as needed

// Helper function to decrement free slots for a user on a specific date and court
const decrementFreeSlots = async (userId, courtId, date) => {
  try {
    console.log(`\n[FREE SLOTS TRACKING] Decrementing free slots for user ${userId} on court ${courtId} for date ${date}`);
    
    // Ensure we have a valid date object
    let bookingDate;
    if (typeof date === 'string') {
      const [year, month, day] = date.split('-').map(Number);
      bookingDate = new Date(Date.UTC(year, month - 1, day));
    } else if (date instanceof Date) {
      // Ensure we use date in UTC
      bookingDate = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      ));
    } else {
      throw new Error('Invalid date format provided to decrementFreeSlots');
    }
    
    const formattedDate = bookingDate.toISOString().split('T')[0];
    console.log(`[FREE SLOTS TRACKING] Formatted booking date for DB query: ${formattedDate}`);
    
    // Check if record already exists first
    const existingRecord = await FreeSlots.findOne({
      user: userId,
      court: courtId,
      date: bookingDate
    });
    
    // Process based on existing record
    let freeSlotRecord;
    
    if (existingRecord) {
      console.log(`[FREE SLOTS TRACKING] Found existing record with ${existingRecord.remainingSlots} slots remaining`);
      
      // Check if user already has no slots remaining
      if (existingRecord.remainingSlots <= 0) {
        console.log(`[FREE SLOTS TRACKING] User ${userId} already has no remaining slots for ${formattedDate}. Cannot decrement further.`);
        return 0; // Return 0 slots remaining
      }
      
      // Update existing record
      freeSlotRecord = await FreeSlots.findByIdAndUpdate(
        existingRecord._id,
        { $inc: { remainingSlots: -1 } },
        { new: true }
      );
    } else {
      console.log(`[FREE SLOTS TRACKING] No existing record found, creating new one with ${FREE_SLOT_LIMIT_PER_DAY - 1} slots remaining`);
      
      // Create new record
      freeSlotRecord = await FreeSlots.create({
        user: userId,
        court: courtId,
        date: bookingDate,
        remainingSlots: FREE_SLOT_LIMIT_PER_DAY - 1
      });
    }
    
    console.log(`[FREE SLOTS TRACKING] After update: User ${userId} now has ${freeSlotRecord.remainingSlots} remaining slots for ${formattedDate}`);
    return freeSlotRecord.remainingSlots;
  } catch (error) {
    console.error(`[FREE SLOTS ERROR] Failed to decrement free slots: ${error.message}`, error);
    throw error; // Rethrow to handle in the calling function
  }
};

const bookingController = {
    // GET /api/bookings
    getUserBookings: async (req, res) => {
        const context = 'GET_USER_BOOKINGS';
        log('INFO', context, `User ${req.user._id} fetching their bookings.`);
        try {
            // TODO: Implement logic to fetch bookings for req.user._id
            // Populate courtDetails as done in PlayerBooking.vue
             const bookings = await Booking.find({ user: req.user._id })
                .populate({
                    path: 'court',
                    select: 'name futsal surfaceType courtType images priceHourly pricePeakHours priceOffPeakHours hasPeakHours peakHours hasOffPeakHours offPeakHours', // Select necessary fields
                    populate: { // Populate futsal details within court
                        path: 'futsalId',
                        select: 'name location operatingHours' // Select necessary futsal fields
                    }
                })
                .sort({ date: -1, startTime: -1 }); // Sort by date descending

             // Manually construct courtDetails similar to frontend for consistency
             const formattedBookings = bookings.map(b => {
                 const courtData = b.court || {};
                 const futsalData = courtData.futsalId || {};
                 return {
                     ...b.toObject(), // Convert Mongoose doc to plain object
                     courtDetails: {
                         _id: courtData._id,
                         name: courtData.name,
                         futsalName: futsalData.name,
                         surfaceType: courtData.surfaceType,
                         courtType: courtData.courtType,
                         images: courtData.images || [],
                         priceHourly: courtData.priceHourly,
                         // Add other required fields from court/futsal if needed
                         // Ensure this matches the structure expected by PlayerBooking.vue
                     }
                     // Remove the original populated 'court' field if desired to avoid redundancy
                     // court: undefined, 
                 };
             });


            log('INFO', context, `Found ${formattedBookings.length} bookings for user ${req.user._id}`);
            res.status(200).json(formattedBookings);
        } catch (error) {
            log('ERROR', context, `Error fetching bookings for user ${req.user._id}: ${error.message}`, error);
            res.status(500).json({ message: 'Failed to retrieve bookings.' });
        }
    },

    // GET /api/bookings/:bookingId
    getBookingById: async (req, res) => {
        const context = 'GET_BOOKING_BY_ID';
        log('INFO', context, `Fetching details for booking ${req.params.bookingId}`);
         try {
            const booking = await Booking.findById(req.params.bookingId)
                .populate({ path: 'court', select: 'name futsal surfaceType courtType images', populate: { path: 'futsalId', select: 'name location operatingHours' } })
                .populate('user', 'name email'); // Populate basic user info

            if (!booking) {
                log('WARN', context, `Booking not found: ${req.params.bookingId}`);
                return res.status(404).json({ message: 'Booking not found' });
            }

            // Check authorization (user owns booking or is admin)
            // *** IMPORTANT: Ensure req.user is populated by your auth middleware ***
            if (!req.user || (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superAdmin')) {
                 log('WARN', context, `User ${req.user?._id} unauthorized to view booking ${req.params.bookingId}`);
                 return res.status(403).json({ message: 'Not authorized to view this booking' });
            }
            
             // Format similarly to getUserBookings
            const courtData = booking.court || {};
            const futsalData = courtData.futsalId || {};
            const formattedBooking = {
                 ...booking.toObject(),
                 courtDetails: {
                     _id: courtData._id,
                     name: courtData.name,
                     futsalName: futsalData.name,
                     surfaceType: courtData.surfaceType,
                     courtType: courtData.courtType,
                     images: courtData.images || []
                 }
             };

            log('INFO', context, `Successfully retrieved booking ${req.params.bookingId}`);
            res.status(200).json(formattedBooking);
        } catch (error) {
            log('ERROR', context, `Error fetching booking ${req.params.bookingId}: ${error.message}`, error);
            res.status(500).json({ message: 'Failed to retrieve booking details.' });
        }
    },

    // POST /api/bookings
    createBooking: async (req, res) => {
        const context = 'CREATE_BOOKING';
        log('INFO', context, `Received booking creation request from user ${req.user._id}`, req.body);
        let finalBooking;
        let court; // Define court here to access futsalId later

        try {
            const {
                courtId,
                date,
                startTime,
                endTime,
                paymentMethod = 'khalti', // Default if not provided
                totalAmount: frontEndTotalAmount, // Amount calculated by frontend (for verification)
                totalPointsCost: frontEndTotalPointsCost, // Points cost calculated by frontend
                selectedSlotsDetail // Optional: Frontend might send details
            } = req.body;
            const userId = req.user._id;

            // --- Basic Validation ---
            if (!courtId || !date || !startTime || !endTime) {
                log('WARN', context, 'Missing required booking fields.');
                return res.status(400).json({ message: 'Court ID, date, start time, and end time are required.' });
            }

            // Find Court & Validate
            court = await Court.findById(courtId).populate('futsalId', 'operatingHours name'); // Populate name for notification
            if (!court) {
                log('WARN', context, `Court not found: ${courtId}`);
                return res.status(404).json({ message: 'Court not found' });
            }

            // Validate Date Format & Ensure UTC Midnight
            let bookingDateUTC;
            try {
                const [year, month, day] = date.split('-').map(Number);
                bookingDateUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
                if (isNaN(bookingDateUTC.getTime())) throw new Error('Invalid date');
            } catch (e) {
                log('ERROR', context, `Invalid date format: ${date}`, e);
                return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
            }

            // Validate Time against Operating Hours (if futsalId is populated)
            if (court.futsalId?.operatingHours) {
                 try {
                    if (!isTimeInRange(startTime, court.futsalId.operatingHours.opening, court.futsalId.operatingHours.closing) ||
                        !isTimeInRange(endTime, court.futsalId.operatingHours.opening, court.futsalId.operatingHours.closing, true)) { // Allow endTime to be closing time
                        log('WARN', context, `Booking time ${startTime}-${endTime} outside operating hours ${court.futsalId.operatingHours.opening}-${court.futsalId.operatingHours.closing}`);
                        return res.status(400).json({ message: 'Selected time is outside operating hours.' });
                    }
                } catch(timeError) {
                    log('ERROR', context, `Error checking operating hours: ${timeError.message}`);
                    // Decide if you want to proceed or return an error if time validation fails
                     return res.status(500).json({ message: 'Could not verify operating hours.' });
                }
            } else {
                 log('WARN', context, `Futsal operating hours not found for court ${courtId}. Skipping check.`);
            }


            // Check Availability (Simplified - assumes 1 hour slots for now)
            const checkStartDate = bookingDateUTC;
            const checkEndDate = new Date(bookingDateUTC.getTime() + 24 * 60 * 60 * 1000); // Next day midnight UTC

            const existingBooking = await Booking.findOne({
                court: courtId,
                date: { $gte: checkStartDate, $lt: checkEndDate },
                startTime: startTime,
                // endTime: endTime, // Might be too strict if only checking start time overlap
                status: { $nin: ['cancelled', 'failed'] } // Consider pending bookings as unavailable
            });

            if (existingBooking) {
                log('WARN', context, `Time slot ${date} ${startTime}-${endTime} already booked or pending (Booking ID: ${existingBooking._id}, Status: ${existingBooking.status}).`);
                return res.status(409).json({ message: 'This time slot is already booked or pending.' }); // 409 Conflict
            }

            // --- Calculate Price (Backend Calculation is Authoritative) ---
            let calculatedPrice = 0;
            let priceType = 'regular';
            try {
                if (court.hasPeakHours && isTimeInRange(startTime, court.peakHours?.start, court.peakHours?.end)) {
                    calculatedPrice = court.pricePeakHours || court.priceHourly;
                    priceType = 'peak';
                } else if (court.hasOffPeakHours && isTimeInRange(startTime, court.offPeakHours?.start, court.offPeakHours?.end)) {
                    calculatedPrice = court.priceOffPeakHours || court.priceHourly;
                    priceType = 'offPeak';
                } else {
                    calculatedPrice = court.priceHourly;
                    priceType = 'regular';
                }
                log('INFO', context, `Backend calculated price: ${calculatedPrice} (${priceType})`);

                // Optional: Compare with frontend calculation for sanity check/logging
                if (frontEndTotalAmount !== undefined && calculatedPrice !== frontEndTotalAmount) {
                    log('WARN', context, `Price mismatch: Frontend calculated ${frontEndTotalAmount}, Backend calculated ${calculatedPrice}. Using backend price.`);
                }
            } catch (priceError) {
                log('ERROR', context, `Error calculating price: ${priceError.message}. Using default hourly rate.`);
                calculatedPrice = court.priceHourly;
                priceType = 'regular';
            }

            // Calculate points cost (Backend authoritative)
            // Assuming POINTS_PER_HOUR is defined (e.g., 10). Duration is 1 hour for now.
            const durationHours = 1; // TODO: Calculate duration properly if multi-hour slots are possible
            const calculatedPointsCost = Math.round(calculatedPrice / 10) * durationHours; // Or based on POINTS_PER_HOUR
            log('INFO', context, `Backend calculated points cost: ${calculatedPointsCost}`);

            // --- Prepare Booking Data --- 
            const bookingData = {
                court: courtId,
                user: userId,
                date: bookingDateUTC,
                startTime,
                endTime,
                price: calculatedPrice,
                priceType,
                status: 'pending', // Default to pending, update after payment/confirmation
                paymentStatus: 'pending',
                paymentDetails: { method: paymentMethod },
                isLoyaltyRedemption: paymentMethod === 'points',
                pointsUsed: 0, // Set later if points are used
                purchaseOrderId: `BOOKING-${new mongoose.Types.ObjectId().toString()}`
            };

            // --- Handle Payment Method --- 
            if (paymentMethod === 'points') {
                log('INFO', context, 'Processing booking with points.');
                const userLoyalty = await Loyalty.findOne({ user: userId });
                if (!userLoyalty || userLoyalty.points < calculatedPointsCost) {
                    log('WARN', context, `User ${userId} has insufficient points (${userLoyalty?.points || 0} / ${calculatedPointsCost}).`);
                    return res.status(400).json({ message: 'Insufficient loyalty points.' });
                }

                // Deduct points & create transaction record
                userLoyalty.points -= calculatedPointsCost;
                await userLoyalty.save();

                const loyaltyTx = new LoyaltyTransaction({
                    user: userId,
                    type: 'redemption',
                    points: -calculatedPointsCost,
                    description: `Booking for court ${court.name} on ${date}`,
                });
                await loyaltyTx.save();

                bookingData.pointsUsed = calculatedPointsCost;
                bookingData.status = 'confirmed';
                bookingData.paymentStatus = 'paid';
                bookingData.paymentDetails.transactionId = loyaltyTx._id.toString();
                bookingData.paymentDetails.paidAmount = 0; // Paid with points
                bookingData.paymentDetails.paidAt = new Date();

                finalBooking = new Booking(bookingData);
                await finalBooking.save();
                log('INFO', context, `Booking ${finalBooking._id} confirmed using points.`);
                
                // --- Send Notification to Admin (Points) --- 
                try {
                    if (court?.futsalId) {
                        const futsalAdmin = await User.findOne({ futsal: court.futsalId._id, role: 'futsalAdmin' });
                        if (futsalAdmin) {
                             await createNotification(
                                futsalAdmin._id,
                                'New Booking Created',
                                `New booking by ${req.user.username || 'user'} for ${court.name} on ${date} at ${startTime}.`,
                                'new_booking_admin',
                                `/admin-bookings` 
                            );
                            log('INFO', context, `Sent booking creation notification to admin ${futsalAdmin._id}`);
                        } else {
                             log('WARN', context, `Futsal admin not found for futsal ${court.futsalId._id} to send notification.`);
                        }
                    } else {
                         log('WARN', context, `Could not determine futsal to send admin notification for booking ${finalBooking._id}`);
                    }
                } catch (notifyError) {
                    log('ERROR', context, `Failed to send booking creation notification: ${notifyError.message}`, notifyError);
                }
                // --- End Notification Logic (Points) --- 

                res.status(201).json({ booking: finalBooking, message: 'Booking confirmed using points.' });

            } else if (paymentMethod === 'khalti') {
                 log('INFO', context, 'Processing booking with Khalti.');
                if (calculatedPrice <= 0) {
                    log('INFO', context, 'Booking price is zero or less, confirming directly without Khalti.');
                    bookingData.status = 'confirmed';
                    bookingData.paymentStatus = 'paid'; // Considered paid as price is 0
                    bookingData.paymentDetails.method = 'khalti'; // Still record method
                    bookingData.paymentDetails.paidAmount = 0;
                    bookingData.paymentDetails.paidAt = new Date();
                    
                    finalBooking = new Booking(bookingData);
                    await finalBooking.save();
                    log('INFO', context, `Booking ${finalBooking._id} confirmed directly (Price <= 0).`);

                    // --- Send Notification to Admin (Khalti - Free) --- 
                    try {
                        if (court?.futsalId) {
                            const futsalAdmin = await User.findOne({ futsal: court.futsalId._id, role: 'futsalAdmin' });
                            if (futsalAdmin) {
                                await createNotification(
                                    futsalAdmin._id,
                                    'New Booking Created (Zero Price)',
                                    `New booking (Price ≤ 0) by ${req.user.username || 'user'} for ${court.name} on ${date} at ${startTime}.`,
                                    'new_booking_admin',
                                    `/admin-bookings` 
                                );
                                log('INFO', context, `Sent zero-price booking creation notification to admin ${futsalAdmin._id}`);
                            } else {
                                log('WARN', context, `Futsal admin not found for futsal ${court.futsalId._id} to send notification.`);
                            }
                        } else {
                            log('WARN', context, `Could not determine futsal to send admin notification for booking ${finalBooking._id}`);
                        }
                    } catch (notifyError) {
                        log('ERROR', context, `Failed to send booking creation notification: ${notifyError.message}`, notifyError);
                    }
                    // --- End Notification Logic (Khalti - Free) --- 

                     res.status(201).json({ booking: finalBooking, message: 'Booking confirmed (Price Zero).' });
                } else {
                    // Price > 0, proceed with Khalti payment initiation
                    log('INFO', context, `Price is ${calculatedPrice}. Creating pending booking and initiating Khalti flow.`);
                    // Create pending booking first
                    bookingData.status = 'pending';
                    bookingData.paymentStatus = 'pending';
                    bookingData.paymentDetails.method = 'khalti';
                     // Set reservation expiry (e.g., 15 minutes from now)
                    bookingData.reservationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
                    
                    finalBooking = new Booking(bookingData);
                    await finalBooking.save();
                    log('INFO', context, `Pending booking ${finalBooking._id} created. Expiry: ${bookingData.reservationExpiresAt}`);

                    // Initiate Khalti Payment with CORRECT arguments
                    const paymentInitiationResult = await initiatePaymentFlow(
                        'booking',                  // itemType
                        finalBooking._id.toString(), // itemId (The ID of the booking just created)
                        userId                      // userId (The ID of the logged-in user)
                    );

                    if (paymentInitiationResult.success) {
                        log('INFO', context, `Khalti payment initiated successfully for booking ${finalBooking._id}. PIDX: ${paymentInitiationResult.pidx}`);
                        // Update booking with pidx
                        finalBooking.pidx = paymentInitiationResult.pidx;
                        await finalBooking.save();
                        
                        res.status(200).json({ // Send 200 OK with payment URL
                            message: 'Booking pending. Please complete payment.',
                            paymentUrl: paymentInitiationResult.payment_url,
                            bookingId: finalBooking._id,
                            pidx: paymentInitiationResult.pidx,
                            purchaseOrderId: bookingData.purchaseOrderId
                        });
                    } else {
                        log('ERROR', context, `Khalti payment initiation failed for pending booking ${finalBooking._id}. Reason: ${paymentInitiationResult.message}`);
                        // Should we cancel the pending booking here?
                        // finalBooking.status = 'failed'; // Or maybe keep pending?
                        // finalBooking.cancellationReason = 'Payment initiation failed';
                        // await finalBooking.save();
                        res.status(500).json({ message: 'Failed to initiate Khalti payment. Please try again.' });
                    }
                }
            } else {
                // Handle other payment methods or default offline/pay later
                log('INFO', context, `Processing booking with default/offline method (requiresPrepayment: ${court.requirePrepayment}).`);
                if (court.requirePrepayment) {
                    log('WARN', context, `Court ${courtId} requires prepayment, but method is not Khalti/Points/Free.`);
                    // Decide: Either error out, or default to Khalti?
                    // For now, error out if prepayment required but invalid method given.
                    return res.status(400).json({ message: 'This court requires prepayment via Khalti or Points.' });
                }
                
                // Check if user has free slots available
                const formattedDate = bookingDateUTC.toISOString().split('T')[0];
                console.log(`\n[FREE SLOTS BOOKING] Checking free slots for user ${userId} on court ${courtId} for date ${formattedDate}`);
                
                const freeSlotRecord = await FreeSlots.findOne({
                    user: userId,
                    court: courtId,
                    date: bookingDateUTC
                });
                
                let remainingFreeSlots = FREE_SLOT_LIMIT_PER_DAY; // Default to max
                
                if (freeSlotRecord) {
                    remainingFreeSlots = freeSlotRecord.remainingSlots;
                    console.log(`[FREE SLOTS BOOKING] Found existing record: ${remainingFreeSlots} slots remaining`);
                } else {
                    console.log(`[FREE SLOTS BOOKING] No record found, using default limit: ${FREE_SLOT_LIMIT_PER_DAY} slots remaining`);
                }
                
                console.log(`[FREE SLOTS BOOKING] User ${userId} has ${remainingFreeSlots} free slots remaining for court ${courtId} on ${formattedDate}`);
                
                // If no free slots remaining, require payment
                if (remainingFreeSlots <= 0) {
                    console.log(`[FREE SLOTS BOOKING] User ${userId} has no free slots remaining. Requiring payment.`);
                    return res.status(400).json({ 
                        message: 'You have used all your free slots for today. Please use Khalti or Points payment method.',
                        freeSlotLimit: FREE_SLOT_LIMIT_PER_DAY,
                        remainingFreeSlots: remainingFreeSlots
                    });
                }
                
                console.log(`[FREE SLOTS BOOKING] User ${userId} has free slots available. Proceeding with free booking.`);
                
                // No prepayment required, confirm booking now
                bookingData.status = 'confirmed';
                bookingData.paymentStatus = 'unpaid'; // User pays at venue
                bookingData.paymentDetails.method = 'offline'; 
                bookingData.isSlotFree = true; // Mark as a free slot booking
                
                finalBooking = new Booking(bookingData);
                // Populate user details before saving if needed for notification below
                await finalBooking.populate('user', '_id username'); 
                await finalBooking.save();
                log('INFO', context, `Booking ${finalBooking._id} confirmed (Offline/Pay Later). Price: ${bookingData.price}, Payment Status: ${bookingData.paymentStatus}`);

                try {
                    // Decrement free slots count for this user, court, and date
                    console.log(`[FREE SLOTS BOOKING] Calling decrementFreeSlots for user ${userId}, court ${courtId}, date ${formattedDate}`);
                    const remainingSlotsAfterDecrement = await decrementFreeSlots(userId, courtId, formattedDate);
                    console.log(`[FREE SLOTS BOOKING] After decrement: User ${userId} now has ${remainingSlotsAfterDecrement} remaining slots`);
                } catch (error) {
                    console.error(`[FREE SLOTS BOOKING] Failed to decrement free slots: ${error.message}. This won't affect the booking, but free slots tracking might be incorrect.`);
                }

                // --- Send Notification to Admin (Offline) --- 
                try {
                    if (court?.futsalId) {
                        const futsalAdmin = await User.findOne({ futsal: court.futsalId._id, role: 'futsalAdmin' });
                        if (futsalAdmin) {
                             await createNotification(
                                futsalAdmin._id,
                                'New Booking Created (Pay at Venue)',
                                `New booking (Pay at Venue) by ${req.user.username || 'user'} for ${court.name} on ${date} at ${startTime}.`,
                                'new_booking_admin',
                                `/admin-bookings` 
                            );
                            log('INFO', context, `Sent offline booking creation notification to admin ${futsalAdmin._id}`);
                        } else {
                             log('WARN', context, `Futsal admin not found for futsal ${court.futsalId._id} to send notification.`);
                        }
                    } else {
                         log('WARN', context, `Could not determine futsal to send admin notification for booking ${finalBooking._id}`);
                    }
                } catch (notifyError) {
                    log('ERROR', context, `Failed to send booking creation notification: ${notifyError.message}`, notifyError);
                }
                // --- End Notification Logic (Offline) --- 
                
                // --- Send Notification to User (Offline) --- 
                try {
                    const bookedUserId = finalBooking.user?._id; // Get user ID from populated booking
                    if (bookedUserId) {
                         await createNotification(
                            bookedUserId,
                            'Booking Confirmed (Pay at Venue)',
                            `Your booking for ${court?.name || 'court'} on ${date} at ${startTime} is confirmed. Please pay at the venue.`,
                            'booking_confirmation', // Use a general confirmation type
                            `/my-bookings/${finalBooking._id}` // Link to booking details
                        );
                        log('INFO', context, `Sent offline booking confirmation notification to user ${bookedUserId}`);
                    } else {
                         log('WARN', context, `Cannot send offline booking confirmation notification, user ID not found on booking ${finalBooking._id}.`);
                    }
                } catch (notifyError) {
                     log('ERROR', context, `Failed to send offline booking confirmation notification to user for booking ${finalBooking._id}: ${notifyError.message}`, notifyError);
                }
                // --- End User Notification (Offline) --- 
                
                res.status(201).json({ booking: finalBooking, message: 'Booking confirmed. Please pay at the venue.' });
            }

        } catch (error) {
            log('ERROR', context, `Unexpected error during booking creation: ${error.message}`, error);
            // Attempt to notify admin even on failure? Maybe not.
            res.status(500).json({ message: 'An unexpected error occurred while creating the booking.' });
        }
    },

    // PATCH /api/bookings/:bookingId/cancel (User or Admin)
    cancelBooking: async (req, res) => {
        const context = 'CANCEL_BOOKING';
        const { bookingId } = req.params;
        const { reason } = req.body; // Get reason from request body
        const userId = req.user._id;
        const userRole = req.user.role;

        log('INFO', context, `User ${userId} (Role: ${userRole}) attempting to cancel booking ${bookingId} with reason: ${reason || 'None provided'}`);
        try {
             // Populate court and futsalId for notification
             const booking = await Booking.findById(bookingId).populate({ 
                path: 'court', 
                select: '_id name futsalId' // Need futsalId
             });

             if (!booking) {
                log('WARN', context, `Booking ${bookingId} not found for cancellation attempt by user ${userId}.`);
                return res.status(404).json({ message: 'Booking not found' });
             }

             // Authorization: Check if user owns the booking OR is an admin (admin, superAdmin, futsalAdmin)
             const isAdmin = ['admin', 'superAdmin', 'futsalAdmin'].includes(userRole);
             if (booking.user.toString() !== userId.toString() && !isAdmin) {
                log('WARN', context, `User ${userId} (Role: ${userRole}) is unauthorized to cancel booking ${bookingId} owned by ${booking.user}.`);
                return res.status(403).json({ message: 'Not authorized to cancel this booking' });
             }
             
             // Check if booking can be cancelled (e.g., not already cancelled or completed)
             if (['cancelled', 'completed'].includes(booking.status)) {
                 log('INFO', context, `Booking ${bookingId} is already ${booking.status} and cannot be cancelled again.`);
                 return res.status(400).json({ message: `Booking is already ${booking.status}` });
             }

             // Determine the cancellation reason based on who is cancelling
             const cancellationReason = isAdmin ? 
                `Cancelled by admin (${userRole}) ${reason ? ': ' + reason : ''}` : 
                `Cancelled by player ${reason ? ': ' + reason : ''}`;

             // Use the model's cancel method
             await booking.cancel(cancellationReason); // Pass the determined reason
             
             // TODO: Handle potential refunds (e.g., if prepaid)
             // TODO: Handle loyalty points return if points were used
             // TODO: Update TimeSlot document to mark as available again?

             log('INFO', context, `Booking ${bookingId} successfully cancelled by user ${userId}. Reason: ${cancellationReason}`);
             
             // --- Send Notification to Admin IF Player Cancelled --- 
             if (!isAdmin) {
                try {
                    const court = booking.court; // Populated earlier
                    if (court?.futsalId) {
                        const futsalAdmin = await User.findOne({ futsal: court.futsalId, role: 'futsalAdmin' });
                        if (futsalAdmin) {
                             await createNotification(
                                futsalAdmin._id,
                                'Booking Cancelled by Player',
                                `Booking for ${court.name} on ${new Date(booking.date).toLocaleDateString()} at ${booking.startTime} was cancelled by player ${req.user.username || userId}. Reason: ${reason || 'None provided'}`,
                                'booking_cancel_admin',
                                `/admin-bookings` 
                            );
                            log('INFO', context, `Sent booking cancellation notification to admin ${futsalAdmin._id}`);
                        } else {
                             log('WARN', context, `Futsal admin not found for futsal ${court.futsalId} to send cancellation notification.`);
                        }
                    } else {
                         log('WARN', context, `Could not determine futsal to send admin cancellation notification for booking ${bookingId}`);
                    }
                } catch (notifyError) {
                    log('ERROR', context, `Failed to send booking cancellation notification: ${notifyError.message}`, notifyError);
                }
             }
             // --- End Notification Logic --- 
             
             res.status(200).json({ message: 'Booking cancelled successfully' });

        } catch (error) {
            log('ERROR', context, `Error cancelling booking ${bookingId} for user ${userId}: ${error.message}`, error);
            res.status(500).json({ message: 'Failed to cancel booking.' });
        }
    },

    // POST /api/bookings/:bookingId/delete
    deleteBookingHistory: async (req, res) => {
        const context = 'DELETE_BOOKING_HISTORY';
        const { bookingId } = req.params;
        const userId = req.user._id;
         log('INFO', context, `User ${userId} attempting to delete booking ${bookingId} from history.`);
         try {
             const booking = await Booking.findOne({ _id: bookingId, user: userId });

            if (!booking) {
                log('WARN', context, `Booking ${bookingId} not found or not owned by user ${userId} for history deletion.`);
                // Return 404 even if it exists but belongs to another user, to avoid leaking info
                return res.status(404).json({ message: 'Booking not found.' });
            }
            
             // Check if booking is in a deletable state (e.g., completed or cancelled)
             if (!['completed', 'cancelled'].includes(booking.status)) {
                 log('WARN', context, `User ${userId} tried to delete non-completed/cancelled booking ${bookingId} (Status: ${booking.status}).`);
                 return res.status(400).json({ message: 'Only completed or cancelled bookings can be deleted from history.' });
             }

            booking.isDeletedFromHistory = true;
            await booking.save();

            log('INFO', context, `Booking ${bookingId} marked as deleted from history for user ${userId}.`);
            res.status(200).json({ message: 'Booking deleted from history successfully.' });

         } catch (error) {
            log('ERROR', context, `Error deleting booking ${bookingId} history for user ${userId}: ${error.message}`, error);
            res.status(500).json({ message: 'Failed to delete booking from history.' });
        }
    },

    // GET /api/bookings/availability
    checkAvailability: async (req, res) => {
         // TODO: Implement logic (likely needs courtId, date, startTime, endTime in query)
        res.status(501).json({ message: 'Availability check not implemented.' });
    },

    // GET /api/bookings/court/:courtId (Admin)
    getAdminCourtBookings: async (req, res) => {
         // TODO: Implement Admin logic (check req.user.role)
        res.status(501).json({ message: 'Admin court bookings endpoint not implemented.' });
    },

    // GET /api/bookings/admin/all (Admin)
    getAllBookings: async (req, res) => {
        const context = 'ADMIN_GET_ALL_BOOKINGS';
        // Ensure user is an admin and has an associated futsal
        if (req.user.role !== 'futsalAdmin' || !req.user.futsal) {
            log('WARN', context, `Unauthorized attempt to access all bookings. User: ${req.user._id}, Role: ${req.user.role}`);
            return res.status(403).json({ message: 'Access denied.' });
        }
        
        const adminFutsalId = req.user.futsal;
        log('INFO', context, `Fetching all bookings for admin futsal: ${adminFutsalId}`);

        try {
            const { 
                page = 1, 
                limit = 10, 
                sortBy = 'date', // Default sort field
                sortOrder = 'desc', // Default sort order
                status, // Filter by status (optional)
                search // Search term (optional)
            } = req.query;

            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            const skip = (pageNum - 1) * limitNum;

            // --- Build Query Filter ---
            let queryFilter = { futsal: adminFutsalId }; // Base filter for admin's futsal
            
            // Find courts associated with the admin's futsal
            const courtsInFutsal = await Court.find({ futsalId: adminFutsalId }).select('_id');
            if (!courtsInFutsal || courtsInFutsal.length === 0) {
                log('INFO', context, `No courts found for futsal ${adminFutsalId}. Returning empty booking list.`);
                return res.json({ bookings: [], total: 0, page: 1, pages: 0 });
            }
            const courtIds = courtsInFutsal.map(c => c._id);
            queryFilter = { court: { $in: courtIds } }; // Filter bookings by courts in the futsal

            if (status) {
                queryFilter.status = status;
            }

             // --- Search Implementation (Example: search user name/username, court name) ---
             if (search) {
                 const searchRegex = new RegExp(search, 'i'); // Case-insensitive search
                 // Find users matching search term
                 const matchingUsers = await User.find({ 
                     $or: [
                         { firstName: searchRegex }, 
                         { lastName: searchRegex }, 
                         { username: searchRegex }
                     ]
                 }).select('_id');
                 const userIds = matchingUsers.map(u => u._id);

                // Find courts matching search term (if needed)
                // const matchingCourts = await Court.find({ name: searchRegex, futsalId: adminFutsalId }).select('_id');
                // const searchCourtIds = matchingCourts.map(c => c._id);

                queryFilter.$or = [
                    { user: { $in: userIds } },
                     // { court: { $in: searchCourtIds } } // Add if searching court name
                     // Add other fields to search if needed (e.g., booking ID, phone?)
                ];
             }

            // --- Build Sort Object ---
            const sort = {};
            if (sortBy) {
                sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
            }

            // --- Execute Query ---
            log('DEBUG', context, 'Executing find with filter:', queryFilter, 'Sort:', sort, 'Skip:', skip, 'Limit:', limitNum);
            const bookingsRaw = await Booking.find(queryFilter)
                // Populate necessary user fields including contactNumber, not phone
                .populate('user', 'firstName lastName username email contactNumber') // <<< Use contactNumber
                .populate('court', 'name')
                .sort(sort)
                .skip(skip)
                .limit(limitNum);

            const total = await Booking.countDocuments(queryFilter);
            log('INFO', context, `Found ${total} total bookings, returning ${bookingsRaw.length} for page ${pageNum}`);

            // --- Restructure for Frontend ---
            const populatedBookings = bookingsRaw.map(b => {
                const bookingObj = b.toObject();
                const user = bookingObj.user;

                // Construct full name, handle missing parts
                let fullName = 'N/A';
                if (user?.firstName && user?.lastName) {
                    fullName = `${user.firstName} ${user.lastName}`;
                } else if (user?.firstName) {
                    fullName = user.firstName;
                } else if (user?.lastName) {
                    fullName = user.lastName;
                }

                bookingObj.userInfo = {
                    _id: user?._id,
                    name: fullName,
                    username: user?.username,
                    email: user?.email || 'N/A',
                    phone: user?.contactNumber || 'N/A' // <<< Use contactNumber for phone field
                };
                bookingObj.courtDetails = {
                     _id: bookingObj.court?._id,
                     name: bookingObj.court?.name || 'N/A'
                 };
                return bookingObj;
            });

            res.json({
                bookings: populatedBookings, // <<< Send restructured bookings
                total,
                page: pageNum,
                pages: Math.ceil(total / limitNum)
            });

        } catch (error) {
            log('ERROR', context, `Error fetching all bookings: ${error.message}`, error);
            res.status(500).json({ message: 'Failed to retrieve booking details.' });
        }
    },

    // PUT /api/bookings/:bookingId/status (Admin)
    updateBookingStatus: async (req, res) => {
        const context = 'ADMIN_UPDATE_STATUS';
        const { bookingId } = req.params;
        const { status } = req.body; // Expecting { status: 'confirmed' } or similar
        log('INFO', context, `Admin ${req.user?._id} attempting to update status of booking ${bookingId} to ${status}`);
        if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && req.user.role !== 'futsalAdmin')) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        // TODO: Implement actual find/update/save logic
        res.status(501).json({ message: `Admin update booking status (${status}) not fully implemented.` });
    },

    // PATCH /api/bookings/:bookingId/payment (Admin)
    updatePaymentStatus: async (req, res) => {
        const context = 'ADMIN_UPDATE_PAYMENT_STATUS';
        const { bookingId } = req.params;
        const { paymentStatus } = req.body; 
        log('INFO', context, `Admin ${req.user?._id} attempting to update payment status of booking ${bookingId} to ${paymentStatus}`);

        // Authorization check
        if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && req.user.role !== 'futsalAdmin')) { 
            log('WARN', context, `Unauthorized payment status update attempt. User: ${req.user?._id}, Role: ${req.user?.role}`);
            return res.status(403).json({ message: 'Not authorized' });
        }

        try {
            // Populate necessary fields for notification/points
            const booking = await Booking.findById(bookingId)
                .populate('court', 'name')
                .populate('user', '_id username');
                
            if (!booking) {
                log('WARN', context, `Booking ${bookingId} not found for payment status update.`);
                return res.status(404).json({ message: 'Booking not found' });
            }

            // Validate status
            const allowedStatuses = ['paid', 'unpaid', 'pending', 'refunded', 'failed'];
            if (!allowedStatuses.includes(paymentStatus)) {
                log('WARN', context, `Invalid payment status provided: ${paymentStatus}`);
                return res.status(400).json({ message: 'Invalid payment status value.' });
            }

            const previousPaymentStatus = booking.paymentStatus; // Store previous status
            let pointsAwardedInThisUpdate = 0; // Track if points were awarded

            booking.paymentStatus = paymentStatus;
            
            // --- Award Loyalty Points & Set Details if changing status TO 'paid' --- 
            if (paymentStatus === 'paid' && previousPaymentStatus !== 'paid') {
                booking.paymentDetails.paidAt = new Date();
                if (!booking.paymentDetails.method) {
                    booking.paymentDetails.method = 'manual_admin'; 
                }

                // Check if points were already awarded for this booking
                const existingTransaction = await LoyaltyTransaction.findOne({ 
                    booking: booking._id, 
                    type: 'credit' // Check for existing credit/earn transaction
                });

                if (!existingTransaction && booking.price > 0) {
                    // Award fixed 10 points for admin manual payment confirmation
                    const pointsToAward = 10; 
                    log('INFO', context, `Awarding fixed ${pointsToAward} loyalty points for booking ${bookingId} (Admin Mark Paid).`);

                    const userLoyalty = await Loyalty.findOneAndUpdate(
                        { user: booking.user },
                        { $inc: { points: pointsToAward }, $setOnInsert: { user: booking.user } },
                        { upsert: true, new: true }
                    );
                    log('INFO', context, `Updated loyalty points for user ${booking.user}. New balance: ${userLoyalty.points}`);

                    // Create transaction log with correct type and reason
                    const loyaltyTx = new LoyaltyTransaction({
                        user: booking.user,
                        type: 'credit', 
                        points: pointsToAward,
                        description: `Points earned from booking ${bookingId} (Admin Confirmed)`,
                        reason: 'booking_payment_admin', // Specific reason
                        booking: booking._id
                    });
                    await loyaltyTx.save();
                    pointsAwardedInThisUpdate = pointsToAward; // Mark points as awarded
                    log('INFO', context, `Created loyalty transaction ${loyaltyTx._id} for booking ${bookingId}.`);
                    
                } else if (existingTransaction) {
                    log('INFO', context, `Loyalty points already awarded for booking ${bookingId} (Tx: ${existingTransaction._id}). Skipping.`);
                } else {
                     log('INFO', context, `Booking price is 0 or less for ${bookingId}. No loyalty points to award.`);
                }

            } else if (paymentStatus !== 'paid') {
                 booking.paymentDetails.paidAt = undefined; 
                 // TODO: Consider clawing back points if status changes from 'paid' to something else?
            }

            // Save booking changes first
            await booking.save();
            log('INFO', context, `Successfully updated payment status for booking ${bookingId} to ${paymentStatus}`);

            // --- Send Notification to User IF status changed TO 'paid' --- 
            if (paymentStatus === 'paid' && previousPaymentStatus !== 'paid') {
                try {
                    const bookedUserId = booking.user?._id; 
                    if (bookedUserId) {
                         await createNotification(
                            bookedUserId,
                            'Booking Payment Confirmed',
                            `Your payment for booking at ${booking.court?.name || 'court'} on ${new Date(booking.date).toLocaleDateString()} (${booking.startTime}-${booking.endTime}) has been confirmed by the administrator.${pointsAwardedInThisUpdate > 0 ? ` You earned ${pointsAwardedInThisUpdate} loyalty points.` : ''}`,
                            'booking_payment_confirmed',
                            `/my-bookings/${booking._id}`
                        );
                        log('INFO', context, `Sent payment confirmation notification to user ${bookedUserId}`);
                    }
                } catch (notifyError) {
                     log('ERROR', context, `Failed to send payment confirmation notification to user for booking ${bookingId}: ${notifyError.message}`, notifyError);
                }
            }
            // --- End User Notification --- 

            res.status(200).json(booking); // Return updated booking

        } catch (error) {
             log('ERROR', context, `Error updating payment status for booking ${bookingId}: ${error.message}`, error);
             res.status(500).json({ message: 'Failed to update payment status.' });
        }
    },

    // PATCH /api/bookings/:bookingId/reschedule (Admin)
    rescheduleBooking: async (req, res) => {
        const context = 'ADMIN_RESCHEDULE_BOOKING';
        const { bookingId } = req.params;
        const { date, startTime, endTime } = req.body; // Expecting new date/times
        log('INFO', context, `Admin ${req.user?._id} attempting to reschedule booking ${bookingId} to ${date} ${startTime}-${endTime}`);

        // TODO: Implement Admin logic (check req.user.role, find booking, validate new times, update, save)
        if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (!date || !startTime || !endTime) {
            return res.status(400).json({ message: 'New date, start time, and end time are required.'});
        }
        // Find booking, validate, update, save...
        res.status(501).json({ message: 'Admin reschedule booking not fully implemented.' });
    },

    // POST /api/bookings/debug/create-test
    createTestBooking: async (req, res) => {
        res.status(501).json({ message: 'Debug create test booking not implemented.' });
    },

    // DELETE /api/bookings/:bookingId (Admin)
    adminDeleteBooking: async (req, res) => {
        const context = 'ADMIN_DELETE_BOOKING';
        const { bookingId } = req.params;
        const userId = req.user?._id; // Use optional chaining

        console.log(`[${context}] Role check for user ${userId}: Received role = ${req.user?.role}`);

        log('INFO', context, `Admin ${userId} attempting to permanently delete booking ${bookingId}`);

        try {
            // Authorization: Allow 'futsalAdmin' in addition to 'admin' and 'superAdmin'
            if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superAdmin' && req.user.role !== 'futsalAdmin')) { 
                log('WARN', context, `Unauthorized delete attempt. User: ${userId}, Role: ${req.user?.role}`);
                return res.status(403).json({ message: 'Not authorized to perform this action' });
            }

            const booking = await Booking.findById(bookingId);

            if (!booking) {
                log('WARN', context, `Booking ${bookingId} not found for deletion attempt by admin ${userId}.`);
                return res.status(404).json({ message: 'Booking not found' });
            }

            // Perform the deletion
            await Booking.findByIdAndDelete(bookingId);

            log('INFO', context, `Booking ${bookingId} successfully deleted by admin ${userId}.`);
            res.status(200).json({ message: 'Booking deleted successfully' });

        } catch (error) {
            log('ERROR', context, `Error deleting booking ${bookingId} by admin ${userId}: ${error.message}`, error);
            res.status(500).json({ message: 'Failed to delete booking.' });
        }
    },

    // POST /api/bookings/:bookingId/remind (Admin/System)
    sendBookingReminder: async (req, res) => {
        res.status(501).json({ message: 'Send booking reminder not implemented.' });
    },

    // GET /api/bookings/free-slots
    getFreeSlots: async (req, res) => {
        try {
            const userId = req.user.userId;
            const { courtId, date } = req.query;
            
            console.log(`\n[FREE SLOTS API] GET request for user ${userId}, court ${courtId}, date ${date}`);
            
            if (!userId) {
                console.error(`[FREE SLOTS ERROR] No userId in request: ${JSON.stringify(req.user)}`);
                return res.status(400).json({ error: 'User ID not found in request' });
            }
            
            if (!courtId) {
                console.error('[FREE SLOTS ERROR] Court ID is required');
                return res.status(400).json({ error: 'Court ID is required' });
            }
            
            if (!date) {
                console.error('[FREE SLOTS ERROR] Date is required');
                return res.status(400).json({ error: 'Date is required' });
            }
            
            // Create a date object with consistent format
            let queryDate;
            if (typeof date === 'string') {
                const [year, month, day] = date.split('-').map(Number);
                queryDate = new Date(Date.UTC(year, month - 1, day));
            } else if (date instanceof Date) {
                queryDate = new Date(Date.UTC(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate()
                ));
            } else {
                console.error(`[FREE SLOTS ERROR] Invalid date format: ${date}`);
                return res.status(400).json({ error: 'Invalid date format' });
            }
            
            const formattedDate = queryDate.toISOString().split('T')[0];
            console.log(`[FREE SLOTS API] Formatted date for DB query: ${formattedDate}`);
            console.log(`[FREE SLOTS API] Looking for record: user=${userId}, court=${courtId}, date=${formattedDate}`);
            
            // Find existing free slots record
            const freeSlotRecord = await FreeSlots.findOne({
                user: userId,
                court: courtId,
                date: queryDate
            });
            
            let remainingFreeSlots = FREE_SLOT_LIMIT_PER_DAY; // Default to max
            
            if (freeSlotRecord) {
                remainingFreeSlots = freeSlotRecord.remainingSlots;
                console.log(`[FREE SLOTS API] Found record: ${remainingFreeSlots} slots remaining, ID: ${freeSlotRecord._id}`);
            } else {
                console.log(`[FREE SLOTS API] No record found, using default: ${FREE_SLOT_LIMIT_PER_DAY} slots remaining`);
            }
            
            console.log(`[FREE SLOTS API] Responding with: dailyLimit=${FREE_SLOT_LIMIT_PER_DAY}, remainingFreeSlots=${remainingFreeSlots}`);
            
            return res.status(200).json({
                dailyLimit: FREE_SLOT_LIMIT_PER_DAY,
                remainingFreeSlots: remainingFreeSlots
            });
        } catch (error) {
            console.error(`[FREE SLOTS ERROR] Error retrieving free slots: ${error.message}`, error);
            return res.status(500).json({ error: 'Failed to retrieve free slots' });
        }
    },

};

module.exports = bookingController; 