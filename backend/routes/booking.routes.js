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
const { createNotification } = require('../utils/notification.service');
const { initiatePaymentFlow } = require('../controllers/payment.controller'); // <-- Import payment initiation
const log = require('../utils/khalti.service').log; // <-- Use shared logger
const { FreeSlots, FREE_SLOT_LIMIT_PER_DAY } = require('../models/freeSlots.model'); // <-- Import FreeSlots model

const POINTS_PER_HOUR = 10; // Define the points constant

router.post('/', auth, async (req, res) => {
    const context = 'BOOKING_CREATE';
    try {
        // Extract booking details from request body
        const { 
            courtId, 
            date, 
            startTime, 
            endTime, 
            userDetails,
            bookedFor = 'self', // default to self booking
            isSlotFree = false, // whether this is a free slot or not
            paymentMethod = 'khalti', // Default to khalti if not specified
            totalAmount = 0, // The total amount in Rupees
            totalPointsCost = 0 // The total cost in loyalty points
        } = req.body;

        log('INFO', context, `Creating booking for court ${courtId}, date: ${date}, time: ${startTime}-${endTime}, User: ${req.user._id}, Payment Method: ${paymentMethod}`);
        
        // Check if court exists
        const court = await Court.findById(courtId);
        if (!court) {
            log('WARN', context, `Court not found: ${courtId}`);
            return res.status(404).json({ message: 'Court not found' });
        }

        // Validate date and time
        if (!date || !startTime || !endTime) {
            log('WARN', context, `Missing date or time`);
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
            log('ERROR', context, `Invalid date string received: ${date}`, e);
            return res.status(400).json({ message: 'Invalid date format provided. Use YYYY-MM-DD.' });
        }

        // === Use the UTC date for checks ===
        const checkStartDate = bookingDateUTC; // Already UTC midnight
        // For end check, add 1 day and subtract 1 ms, all in UTC
        const checkEndDate = new Date(bookingDateUTC.getTime() + 24 * 60 * 60 * 1000);

        // === START DEBUG LOGGING ===
        log('INFO', context, `Checking for existing bookings with params:`);
        log('INFO', context, `courtId: ${courtId}`);
        log('INFO', context, `Date Range Check: GTE=${checkStartDate.toISOString()}, LT=${checkEndDate.toISOString()}`);
        log('INFO', context, `startTime (string): ${startTime}`);
        log('INFO', context, `endTime (string): ${endTime}`);
        
        try {
            const potentiallyConflictingBookings = await Booking.find({
                court: courtId,
                date: { $gte: checkStartDate, $lt: checkEndDate } // Use date-fns range
            });
            log('INFO', context, `Found ${potentiallyConflictingBookings.length} potential conflicts for this court/date range:`);
            potentiallyConflictingBookings.forEach(b => {
                log('INFO', context, `  - ID: ${b._id}, Start: ${b.startTime}, End: ${b.endTime}, Status: ${b.status}, Date: ${b.date.toISOString()}`); // Log date too
            });
        } catch (debugError) {
            log('ERROR', context, "[Booking Debug] Error fetching potential conflicts:", debugError);
        }
        // === END DEBUG LOGGING ===

        // Check if slot is available (Refined Query)
        const existingBooking = await Booking.findOne({
            court: courtId,
            date: { $gte: checkStartDate, $lt: checkEndDate }, // Use date-fns range
            startTime, 
            endTime,   
            status: { $nin: ['cancelled', 'pending'] } // Exclude pending as well, might be pending payment
        });

        if (existingBooking) {
            log('WARN', context, `Found existing NON-CANCELLED/PENDING booking for this exact slot: ID ${existingBooking._id}, Status ${existingBooking.status}`); // Enhanced log
            return res.status(400).json({ message: 'This time slot is already booked or pending payment.' });
        }

        // Get or create the time slot with proper date objects
        try {
            log('INFO', context, `Checking for timeslot - Court: ${courtId}, Date: ${date}, Time: ${startTime}-${endTime}`);
            const timeslot = await getOrCreateTimeSlot(courtId, date, startTime, endTime);
            
            if (timeslot.isBooked) {
                log('WARN', context, `Timeslot is already booked via TimeSlot document: ${timeslot._id}`);
                return res.status(400).json({ message: 'This timeslot was booked concurrently.' });
            }
            
            log('INFO', context, `Timeslot is available: ${timeslot._id}, isBooked: ${timeslot.isBooked}`);
            
            // --- Check for Free Slots Availability ---
            let isBookingActuallyFree = false; // Flag to track if this booking qualifies as free
            let freeBookingsRemaining = 0;
            
            // Initialize pricing variables
            let price = 0;
            let determinedPriceType = 'regular';
            let finalPrice = 0;
            let finalPriceType = 'regular';
            
            // Determine base price based on time of day
            try {
                // Check if the time falls within peak or off-peak hours
                if (court.hasPeakHours && isTimeInRange(startTime, court.peakHours?.start, court.peakHours?.end)) {
                    price = court.pricePeakHours || court.priceHourly;
                    determinedPriceType = 'peak';
                } else if (court.hasOffPeakHours && isTimeInRange(startTime, court.offPeakHours?.start, court.offPeakHours?.end)) {
                    price = court.priceOffPeakHours || court.priceHourly;
                    determinedPriceType = 'offPeak';
                } else {
                    price = court.priceHourly;
                    determinedPriceType = 'regular';
                }
                log('INFO', context, `Base price determined: ${price} (${determinedPriceType})`);
            } catch (priceError) {
                log('ERROR', context, `Error determining price: ${priceError.message}. Using regular hourly rate.`);
                price = court.priceHourly;
                determinedPriceType = 'regular';
            }

            // --- Perform Free Slot Check (if court allows it) --- 
            if (!court.requirePrepayment) {
                log('INFO', context, `Court ${courtId} does not require prepayment. Checking for free slot eligibility.`);
                
                try {
                    // Custom function to get start of day in UTC to ensure date matching
                    const startOfDay = (date) => {
                        return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
                    };
                    
                    // Check if user has free slots for today
                    const userFreeSlotsRecord = await FreeSlots.findOne({ 
                        user: req.user._id, 
                        date: startOfDay(bookingDateUTC) 
                    });
                    
                    if (userFreeSlotsRecord) {
                        freeBookingsRemaining = userFreeSlotsRecord.slotsRemaining || 0;
                    } else {
                        // Create a new record if none exists (initialize with max free slots)
                        const newFreeSlotsRecord = new FreeSlots({
                            user: req.user._id,
                            date: startOfDay(bookingDateUTC),
                            slotsRemaining: FREE_SLOT_LIMIT_PER_DAY // Initialize with max slots
                        });
                        await newFreeSlotsRecord.save();
                        freeBookingsRemaining = FREE_SLOT_LIMIT_PER_DAY;
                    }
                    
                    log('INFO', context, `User has ${freeBookingsRemaining} free slots remaining for ${bookingDateUTC.toISOString().split('T')[0]}`);
                    
                    // Check if this booking qualifies for a free slot
                    const hasFreeSlotAvailable = freeBookingsRemaining > 0;
                    
                    // If booking is eligible for a free slot but user wants to prepay for loyalty points
                    // Respect their choice and process payment
                    if (hasFreeSlotAvailable && (paymentMethod === 'khalti' || paymentMethod === 'points')) {
                        log('INFO', context, `User ${req.user._id} chose to prepay for a booking eligible for a free slot. Processing payment.`);
                        isBookingActuallyFree = false; // Not using the free slot
                    } 
                    // If booking is eligible for a free slot and user wants to use it
                    else if (hasFreeSlotAvailable && paymentMethod === 'free') {
                        log('INFO', context, `User ${req.user._id} is using a free booking slot.`);
                        isBookingActuallyFree = true;
                        finalPrice = 0; // It's a free booking
                        finalPriceType = 'free';
                    }
                    
                    // --- Update Free Slots Counter if Using Free Slot ---
                    if (isBookingActuallyFree) {
                        log('INFO', context, `Decrementing free slots for User ${req.user._id}`);
                        // Update free slots availability in database
                        if (userFreeSlotsRecord) {
                            userFreeSlotsRecord.slotsRemaining -= 1;
                            await userFreeSlotsRecord.save();
                            log('INFO', context, `Updated free slots remaining to ${userFreeSlotsRecord.slotsRemaining}`);
                        }
                    }

                    // If user has free slots remaining, mark booking as free
                    if (freeBookingsRemaining > 0 && !paymentMethod) {
                        // Mark this booking as free (no payment required)
                        log('INFO', context, `Court ${courtId} is being booked using a free slot. Setting price to 0.`);
                        // Override price with 0 for free slots
                        finalPrice = 0;
                        finalPriceType = 'free';
                        isBookingActuallyFree = true;
                        
                        // Decrement user's free slots counter
                        userFreeSlotsRecord.slotsRemaining -= 1;
                        await userFreeSlotsRecord.save();
                        log('INFO', context, `Updated free slots remaining to ${userFreeSlotsRecord.slotsRemaining}`);
                    }
                    else {
                        // User doesn't have free slots, set normal price with deferred payment
                        log('INFO', context, `No free slots available. Setting price to ${price} (${determinedPriceType}) with deferred payment.`);
                        finalPrice = price;
                        finalPriceType = determinedPriceType;
                        isBookingActuallyFree = false;
                    }
                } catch (freeSlotError) {
                    log('ERROR', context, `Error checking free slots: ${freeSlotError.message}. Defaulting to regular pricing.`);
                    finalPrice = price;
                    finalPriceType = determinedPriceType;
                    isBookingActuallyFree = false;
                }
                
                // IMPORTANT: No-prepayment with no free slots doesn't mean free!
                // It just means the user can book without paying upfront
                // The user will still need to pay at the venue
            } else {
                 log('INFO', context, `Court ${courtId} requires prepayment. Payment will be required immediately.`);
                // Keep the price as determined by hour of day logic
                finalPrice = price;
                finalPriceType = determinedPriceType;
                isBookingActuallyFree = false;
            }
            // --- End Free Slot Check ---
            
            // --- Update Free Slots Counter if Using Free Slot ---
            if (isBookingActuallyFree) {
                log('INFO', context, `Decrementing free slots for User ${req.user._id}`);
                // Update free slots availability in database
                if (userFreeSlotsRecord) {
                    userFreeSlotsRecord.slotsRemaining -= 1;
                    await userFreeSlotsRecord.save();
                    log('INFO', context, `Updated free slots remaining to ${userFreeSlotsRecord.slotsRemaining}`);
                }
            }
            
            // --- Check if using points for payment ---
            let processingPointPayment = false;
            if (paymentMethod === 'points') {
                log('INFO', context, `User ${req.user._id} wants to pay with loyalty points: ${totalPointsCost} points`);
                
                // Validate if points payment is supported
                if (totalPointsCost <= 0) {
                    log('ERROR', context, `Invalid points cost: ${totalPointsCost} for booking attempt by User ${req.user._id}`);
                    return res.status(400).json({ message: 'Invalid points cost specified' });
                }
                
                // Check if user has enough loyalty points
                const userLoyalty = await Loyalty.findOne({ user: req.user._id });
                
                if (!userLoyalty || userLoyalty.points < totalPointsCost) {
                    const availablePoints = userLoyalty ? userLoyalty.points : 0;
                    log('ERROR', context, `Insufficient points for User ${req.user._id}. Has: ${availablePoints}, Needs: ${totalPointsCost}`);
                    return res.status(400).json({ 
                        message: 'Insufficient loyalty points', 
                        availablePoints, 
                        requiredPoints: totalPointsCost 
                    });
                }
                
                processingPointPayment = true;
                log('INFO', context, `User ${req.user._id} has enough points (${userLoyalty.points}), proceeding with point payment.`);
            }
            
            // ---- End: Price/Type Logic ----
            
            // Create new booking with determined price and priceType
            const newBooking = new Booking({
                court: courtId,
                user: req.user._id,
                date: bookingDateUTC,
                startTime,
                endTime,
                price: finalPrice, // Use the regular price 
                priceType: finalPriceType, // Use the determined type (regular/peak/offPeak)
                userName: userDetails?.name || req.user.name,
                phone: userDetails?.phone || req.user.phone || 'No Phone Provided',
                email: userDetails?.email || req.user.email,
                status: 'pending', 
                paymentStatus: 'pending', 
                paymentMethod, // Store the chosen payment method
                bookedFor,
                isSlotFree: isBookingActuallyFree // Should be false for normal bookings
            });

            const savedBooking = await newBooking.save();
            log('INFO', context, `Created booking record: ${savedBooking._id} with Price: ${savedBooking.price}, PriceType: ${savedBooking.priceType}, PaymentMethod: ${paymentMethod}`);

            // --- Handle Points Payment ---
            if (processingPointPayment) {
                log('INFO', context, `Processing points payment for Booking ${savedBooking._id}`);
                
                try {
                    // 1. Get the user's loyalty record
                    const userLoyalty = await Loyalty.findOne({ user: req.user._id });
                    
                    // 2. Deduct the points
                    userLoyalty.points -= totalPointsCost;
                    
                    // 3. Add a transaction record
                    userLoyalty.transactions.push({
                        type: 'redeem',
                        points: -totalPointsCost, // Negative to indicate points spent
                        booking: savedBooking._id,
                        description: `Redeemed for booking at ${court.name}`
                    });
                    
                    // 4. Create loyalty transaction record
                    await LoyaltyTransaction.create({
                        user: req.user._id,
                        type: 'debit',
                        points: totalPointsCost,
                        reason: `Booking payment - Booking ID: ${savedBooking._id}`,
                        relatedBooking: savedBooking._id
                    });
                    
                    // 5. Save the loyalty record
                    await userLoyalty.save();
                    
                    // 6. Update booking status
                    savedBooking.status = 'confirmed';
                    savedBooking.paymentStatus = 'paid';
                    savedBooking.paymentDetails = {
                        method: 'loyalty',
                        paidAt: new Date()
                    };
                    // Ensure loyalty redemption data is properly set
                    savedBooking.isLoyaltyRedemption = true;
                    savedBooking.pointsUsed = totalPointsCost;
                    const confirmedBooking = await savedBooking.save();
                    
                    // 7. Update timeslot as booked
                    timeslot.isBooked = true;
                    timeslot.bookedBy = confirmedBooking.user;
                    timeslot.booking = confirmedBooking._id;
                    await timeslot.save();
                    
                    // 8. Send notifications
                    try {
                        // Notification to user
                        await createNotification(
                            req.user._id,
                            'Booking Confirmed with Points',
                            `Your booking for ${court.name} on ${moment(confirmedBooking.date).format('YYYY-MM-DD')} at ${confirmedBooking.startTime} is confirmed! You used ${totalPointsCost} points.`,
                            'booking_confirmation',
                            `/my-bookings/${confirmedBooking._id}`
                        );
                        
                        // Notification to futsal admin
                        const courtWithFutsal = await Court.findById(courtId).populate('futsalId', 'name');
                        if (courtWithFutsal?.futsalId) {
                            const futsalAdmin = await User.findOne({ role: 'futsalAdmin', futsal: courtWithFutsal.futsalId._id });
                            if (futsalAdmin) {
                                await createNotification(
                                    futsalAdmin._id,
                                    'New Booking Paid with Points',
                                    `${userDetails?.name || req.user.name} has made a booking for ${court.name} on ${moment(confirmedBooking.date).format('YYYY-MM-DD')} at ${confirmedBooking.startTime} using loyalty points.`,
                                    'new_booking',
                                    `/admin/bookings/${confirmedBooking._id}`
                                );
                            }
                        }
                    } catch (notifyError) {
                        log('ERROR', context, `Error sending point payment confirmation notifications:`, notifyError);
                    }
                    
                    // 9. Return success response
                    return res.status(201).json({
                        message: 'Booking confirmed and paid with points',
                        booking: confirmedBooking,
                        pointsUsed: totalPointsCost,
                        pointsRemaining: userLoyalty.points
                    });
                    
                } catch (pointsError) {
                    log('ERROR', context, `Error processing points payment for booking ${savedBooking._id}:`, pointsError);
                    // If points processing fails, delete the booking and return error
                    await Booking.findByIdAndDelete(savedBooking._id);
                    return res.status(500).json({ message: 'Failed to process points payment', error: pointsError.message });
                }
            }

            // --- Handle No Prepayment vs Prepayment --- 
            if (!court.requirePrepayment) {
                // --- Handle No-Prepayment Required Court --- 
                // Check if user still wants to prepay (via khalti or points) even though not required
                if (paymentMethod === 'khalti') {
                    // User wants to prepay with Khalti even though it's not required
                    log('INFO', context, `User chose to prepay with Khalti for booking ${savedBooking._id} even though court doesn't require prepayment. Initiating payment flow.`);
                    const initiationResult = await initiatePaymentFlow('booking', savedBooking._id, req.user._id);

                    // Add detailed debugging for Khalti initiation result
                    log('DEBUG', context, `Khalti initiation result for optional prepayment (booking ${savedBooking._id}):`, {
                        success: initiationResult.success,
                        hasPaymentUrl: !!initiationResult.payment_url,
                        paymentUrl: initiationResult.payment_url,
                        purchaseOrderId: initiationResult.purchase_order_id,
                        error: initiationResult.error || 'none'
                    });

                    if (initiationResult.success) {
                        log('INFO', context, `Optional prepayment initiation successful for booking ${savedBooking._id}. Sending payment URL to frontend.`);
                        // Mark TimeSlot as booked (provisionally)
                        timeslot.isBooked = true;
                        timeslot.bookedBy = savedBooking.user;
                        timeslot.booking = savedBooking._id;
                        await timeslot.save();
                        log('INFO', context, `Timeslot ${timeslot._id} marked as provisionally booked for optional prepayment.`);

                        // --- Send Pending Payment Notification --- 
                        try {
                            // Populate court details with futsal information to include in notification
                            const populatedCourt = await Court.findById(court._id).populate('futsalId', 'name');
                            const courtName = populatedCourt.name || 'Court';
                            const futsalName = populatedCourt.futsalId?.name || 'Futsal';
                            
                            await createNotification(
                                savedBooking.user,
                                'Optional Prepayment Pending',
                                `Your booking for ${courtName} at ${futsalName} on ${moment(savedBooking.date).format('YYYY-MM-DD')} at ${savedBooking.startTime} is pending optional prepayment. Complete payment via Khalti to earn bonus loyalty points. If payment isn't completed, your booking will still be valid with payment due at the venue.`,
                                'booking_pending',
                                `/my-bookings/${savedBooking._id}`
                            );
                            log('INFO', context, `Sent optional prepayment notification for booking ${savedBooking._id}`);
                        } catch (notifyError) {
                            log('ERROR', context, `Error sending optional prepayment notification for booking ${savedBooking._id}:`, notifyError);
                        }
                        // --- End Notification ---

                        // Respond with the payment URL
                        const khaltiResponse = {
                            message: 'Booking confirmed with optional prepayment. Complete prepayment for bonus loyalty points.',
                            bookingId: savedBooking._id,
                            paymentUrl: initiationResult.payment_url,
                            purchaseOrderId: initiationResult.purchase_order_id,
                            isOptionalPayment: true
                        };
                        
                        // Debug log the response being sent to frontend
                        log('DEBUG', context, `Sending Khalti payment response to frontend for booking ${savedBooking._id}:`, khaltiResponse);
                        
                        res.status(201).json(khaltiResponse);
                        
                        // Add an explicit return to ensure we don't continue to other code paths
                        return;
                    } else {
                        // Fall back to no-prepayment if Khalti initiation fails
                        log('WARN', context, `Optional prepayment initiation failed for booking ${savedBooking._id}. Falling back to regular no-prepayment booking.`, {
                            error: initiationResult.error || 'Unknown error'
                        });
                        return handleNoPrepaymentBooking();
                    }
                } else if (paymentMethod === 'points') {
                    // User is already using points, so this case is handled above in the processingPointPayment block
                    // Points payment would have been processed and booking confirmed already
                    log('INFO', context, `Points payment already processed for booking ${savedBooking._id}`);
                } else {
                    // Regular no-prepayment flow (payment at venue)
                    return handleNoPrepaymentBooking();
                }
                
                // Helper function to handle regular no-prepayment flow
                async function handleNoPrepaymentBooking() {
                log('INFO', context, `Booking ${savedBooking._id} doesn't require prepayment. Confirming access but payment still needed.`);
                savedBooking.status = 'confirmed'; // Confirm access to the court
                savedBooking.paymentStatus = 'pending'; // But payment is still due
                savedBooking.reservationExpiresAt = undefined; // No expiry needed
                
                const confirmedBooking = await savedBooking.save();
                
                // Update TimeSlot as booked (permanently)
                timeslot.isBooked = true;
                timeslot.bookedBy = confirmedBooking.user;
                timeslot.booking = confirmedBooking._id;
                await timeslot.save();
                log('INFO', context, `Timeslot ${timeslot._id} marked as booked (No prepayment required).`);

                // --- Send No-Prepayment Confirmation Notification --- 
                try {
                    await createNotification(
                        confirmedBooking.user,
                        'Booking Confirmed (Payment Due Later)',
                        `Your booking for ${court.name} on ${moment(confirmedBooking.date).format('YYYY-MM-DD')} at ${confirmedBooking.startTime} is confirmed! Payment of Rs. ${confirmedBooking.price} will be collected at the venue.`,                        
                        'booking_confirmation', // Use standard confirmation type
                        `/my-bookings/${confirmedBooking._id}`
                    );
                    log('INFO', context, `Sent no-prepayment booking confirmation notification for ${confirmedBooking._id}`);
                } catch (notifyError) {
                    log('ERROR', context, `Error sending no-prepayment confirmation notification for ${confirmedBooking._id}:`, notifyError);
                }
                // --- End Notification ---

                // Respond with confirmation (no payment URL)
                    return res.status(201).json({
                    message: 'Booking confirmed successfully. Payment due at venue.',
                    booking: confirmedBooking // Send back the confirmed booking
                });
                }
            } else {
                // --- Initiate Payment Flow (Prepayment Required) --- 
                log('INFO', context, `Booking ${savedBooking._id} requires prepayment. Initiating payment flow.`);
                const initiationResult = await initiatePaymentFlow('booking', savedBooking._id, req.user._id);

                if (initiationResult.success) {
                    log('INFO', context, `Payment initiation successful for booking ${savedBooking._id}. Sending payment URL to frontend.`);
                    // Mark TimeSlot as booked (provisionally)
                    timeslot.isBooked = true;
                    timeslot.bookedBy = savedBooking.user;
                    timeslot.booking = savedBooking._id;
                    await timeslot.save();
                    log('INFO', context, `Timeslot ${timeslot._id} marked as provisionally booked.`);

                    // --- Send Pending Payment Notification --- 
                    try {
                        // Populate court details with futsal information to include in notification
                        const populatedCourt = await Court.findById(court._id).populate('futsalId', 'name');
                        const courtName = populatedCourt.name || 'Court';
                        const futsalName = populatedCourt.futsalId?.name || 'Futsal';
                        
                        await createNotification(
                            savedBooking.user,
                            'Booking Pending Payment',
                            `Your booking for ${courtName} at ${futsalName} on ${moment(savedBooking.date).format('YYYY-MM-DD')} at ${savedBooking.startTime} is pending payment. Please complete payment via Khalti.`,
                            'booking_pending',
                            `/my-bookings/${savedBooking._id}`
                        );
                        log('INFO', context, `Sent pending payment notification for booking ${savedBooking._id}`);
                    } catch (notifyError) {
                        log('ERROR', context, `Error sending pending notification for booking ${savedBooking._id}:`, notifyError);
                    }
                    // --- End Notification ---

                    // Respond with the payment URL
                    res.status(201).json({
                        message: 'Booking pending. Please complete payment.',
                        bookingId: savedBooking._id,
                        paymentUrl: initiationResult.payment_url,
                        purchaseOrderId: initiationResult.purchase_order_id
                    });

                } else {
                    log('ERROR', context, `Payment initiation failed for booking ${savedBooking._id}. Deleting pending booking.`, { error: initiationResult.error });
                    // If initiation fails, delete the pending booking we just created
                    await Booking.findByIdAndDelete(savedBooking._id);
                    // Also revert timeslot if we provisionally booked it (though we didn't reach that point here)
                    res.status(500).json({ message: `Failed to initiate payment: ${initiationResult.error}` });
                }
            }

            // --- Notify Futsal Admin about New Booking (Runs for both free and paid/pending) ---
            /* MOVED to payment.controller.js after successful verification for paid bookings
            try {
                // ... (previous admin notification logic here) ...
            } catch (adminNotifyError) {
                // ...
            }
            */
            // --- End Notify Futsal Admin ---

        } catch (timeSlotError) {
            log('ERROR', context, 'Error with timeslot check/update:', { message: timeSlotError.message, stack: timeSlotError.stack });
            return res.status(500).json({
                message: 'Failed to process time slot',
                error: timeSlotError.message
            });
        }
    } catch (error) {
        log('ERROR', context, 'Error creating booking:', { message: error.message, stack: error.stack });
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
      const { date, courtId } = req.query; // <-- Get courtId from query
      const freeSlotLimit = FREE_SLOT_LIMIT_PER_DAY; // Use the imported constant

      if (!date) {
          return res.status(400).json({ message: 'Date query parameter is required.' });
      }
      if (!courtId) {
          return res.status(400).json({ message: 'Court ID query parameter is required.' });
      }

      let requestedDate;
      try {
        requestedDate = new Date(date);
        if (isNaN(requestedDate.getTime())) {
          throw new Error('Invalid date format');
        }
      } catch (e) {
        return res.status(400).json({ message: 'Invalid date format provided. Use YYYY-MM-DD.' });
      }

      // Find the Futsal ID for the given court
      const court = await Court.findById(courtId).select('futsalId');
      if (!court || !court.futsalId) {
          console.log(`[Free Slots Check] Court ${courtId} or its Futsal ID not found.`);
          // Return 0 available slots if court/futsal invalid, or could return 404
          return res.json({
              freeSlotLimit, 
              freeBookingsUsedToday: 0,
              freeBookingsRemainingToday: freeSlotLimit // Or 0, depending on desired behaviour
          });
      }
      const targetFutsalId = court.futsalId;
      console.log(`[Free Slots Check] Checking for Futsal ID: ${targetFutsalId} based on Court ID: ${courtId}`);

      // Find all courts belonging to this futsal
      const futsalCourts = await Court.find({ futsalId: targetFutsalId }).select('_id');
      const futsalCourtIds = futsalCourts.map(c => c._id);
      console.log(`[Free Slots Check] Found ${futsalCourtIds.length} courts for this futsal.`);

      // Fetch free bookings for the user on the specific date FOR THIS FUTSAL
      const startDate = startOfDay(requestedDate);
      const endDate = endOfDay(requestedDate);
      
      const freeBookingsTodayForFutsal = await Booking.find({
          user: userId,
          isSlotFree: true,
          status: { $ne: 'cancelled' }, 
          date: { $gte: startDate, $lt: endDate },
          court: { $in: futsalCourtIds } // <-- Filter by courts in this futsal
      });

      // Calculate total duration in hours for THIS FUTSAL
      const totalFreeHoursUsedToday = freeBookingsTodayForFutsal.reduce((totalHours, booking) => {
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

      console.log(`[Free Slots Check] User ${userId} used ${totalFreeHoursUsedToday} free hours on ${date} for Futsal ${targetFutsalId}`);
      
      const freeBookingsRemainingToday = Math.max(0, freeSlotLimit - totalFreeHoursUsedToday);
      
      res.json({
        freeSlotLimit, 
        freeBookingsUsedToday: totalFreeHoursUsedToday, // Send total hours used for this futsal
        freeBookingsRemainingToday // Remaining slots based on hours for this futsal
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
      const context = 'BOOKING_CANCEL';
      console.log(`[Cancel Debug] Booking ID: ${booking._id}, Current Status: ${booking.status}`);
      // --- Cancellation Logging END ---
      
      // Update booking status
      booking.status = 'cancelled';
      booking.cancellationReason = req.body.reason || 'User cancelled';
      booking.cancellationDate = new Date();
      
      // *** Update the corresponding TimeSlot document ***
      try {
          // === Correctly construct the UTC Date objects for the query ===
          const bookingDate = booking.date; // Already a Date object at UTC midnight
          const year = bookingDate.getUTCFullYear();
          const month = bookingDate.getUTCMonth();
          const day = bookingDate.getUTCDate();
          const [startHour, startMinute] = booking.startTime.split(':').map(Number);
          const [endHour, endMinute] = booking.endTime.split(':').map(Number);

          const startDateTimeUTC = new Date(Date.UTC(year, month, day, startHour, startMinute));
          const endDateTimeUTC = new Date(Date.UTC(year, month, day, endHour, endMinute));
          // === End constructing UTC Date objects ===

          // Use the booking details to find the timeslot using the constructed Date objects
          const timeslot = await TimeSlot.findOne({
              court: booking.court,
              startTime: startDateTimeUTC, // Use the correct Date object
              // endTime: endDateTimeUTC // Matching startTime is usually sufficient
          });

          if (timeslot) {
              timeslot.isBooked = false;
              timeslot.bookedBy = null;
              timeslot.booking = null;
              await timeslot.save();
              log('INFO', context, `Associated TimeSlot ${timeslot._id} successfully marked as available.`);
          } else {
               // Use the correct date/time in the warning log
              log('WARN', context, `Could not find associated TimeSlot for booking ${booking._id} to mark as available. Court: ${booking.court}, StartTime: ${startDateTimeUTC.toISOString()}`);
              // Maybe create a job to fix this later? Or log for manual review.
          }
      } catch (timeslotError) {
          log('ERROR', context, `Error updating associated TimeSlot for cancelled booking ${booking._id}:`, timeslotError);
          // Continue with cancellation even if timeslot update fails, but log it.
      }
      // *** End TimeSlot Update ***

      await booking.save();
      log('INFO', context, `Booking ${booking._id} cancelled successfully.`);

      // Notify Player

      // --- Notify Futsal Admin about Cancellation ---
      try {
        const cancelledCourt = await Court.findById(booking.court).select('futsalId name');
        if (cancelledCourt?.futsalId) {
            const futsalAdmin = await User.findOne({ role: 'futsalAdmin', futsal: cancelledCourt.futsalId });
            if (futsalAdmin) {
                const cancellingUser = await User.findById(booking.user).select('name'); // Get user's name
                await createNotification(
                    futsalAdmin._id,
                    'Booking Cancelled by User',
                    `Booking for ${cancelledCourt.name} on ${moment(booking.date).format('YYYY-MM-DD')} at ${booking.startTime} was cancelled by ${cancellingUser?.name || 'the user'}. Reason: ${booking.cancellationReason}`,
                    'booking_cancel_admin',
                    `/admin/bookings?status=cancelled` // Link for admin
                );
                console.log(`[User Cancel] Admin notification sent for cancelled booking ${booking._id}`);
            } else {
                console.warn(`[User Cancel] Futsal admin not found for futsal ID ${cancelledCourt.futsalId}`);
            }
        } else {
             console.warn(`[User Cancel] Court ${booking.court} or its futsalId not found, cannot notify admin.`);
        }
      } catch (adminNotifyError) {
          console.error(`[User Cancel] Error sending admin cancellation notification for booking ${booking._id}:`, adminNotifyError);
      }
      // --- End Notify Futsal Admin ---

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
      const context = 'BOOKING_CANCEL';
      console.log(`[Cancel Debug] Booking ID: ${booking._id}, Current Status: ${booking.status}`);
      // --- Cancellation Logging END ---
      
      // Update booking status
      booking.status = 'cancelled';
      booking.cancellationReason = req.body.reason || 'User cancelled';
      booking.cancellationDate = new Date();
      
      // *** Update the corresponding TimeSlot document ***
      try {
          // === Correctly construct the UTC Date objects for the query ===
          const bookingDate = booking.date; // Already a Date object at UTC midnight
          const year = bookingDate.getUTCFullYear();
          const month = bookingDate.getUTCMonth();
          const day = bookingDate.getUTCDate();
          const [startHour, startMinute] = booking.startTime.split(':').map(Number);
          const [endHour, endMinute] = booking.endTime.split(':').map(Number);

          const startDateTimeUTC = new Date(Date.UTC(year, month, day, startHour, startMinute));
          const endDateTimeUTC = new Date(Date.UTC(year, month, day, endHour, endMinute));
          // === End constructing UTC Date objects ===

          // Use the booking details to find the timeslot using the constructed Date objects
          const timeslot = await TimeSlot.findOne({
              court: booking.court,
              startTime: startDateTimeUTC, // Use the correct Date object
              // endTime: endDateTimeUTC // Matching startTime is usually sufficient
          });

          if (timeslot) {
              timeslot.isBooked = false;
              timeslot.bookedBy = null;
              timeslot.booking = null;
              await timeslot.save();
              log('INFO', context, `Associated TimeSlot ${timeslot._id} successfully marked as available.`);
          } else {
               // Use the correct date/time in the warning log
              log('WARN', context, `Could not find associated TimeSlot for booking ${booking._id} to mark as available. Court: ${booking.court}, StartTime: ${startDateTimeUTC.toISOString()}`);
              // Maybe create a job to fix this later? Or log for manual review.
          }
      } catch (timeslotError) {
          log('ERROR', context, `Error updating associated TimeSlot for cancelled booking ${booking._id}:`, timeslotError);
          // Continue with cancellation even if timeslot update fails, but log it.
      }
      // *** End TimeSlot Update ***

      await booking.save();
      log('INFO', context, `Booking ${booking._id} cancelled successfully.`);

      // Notify Player

      // --- Notify Futsal Admin about Cancellation (POST variant) ---
      try {
        const cancelledCourt = await Court.findById(booking.court).select('futsalId name');
        if (cancelledCourt?.futsalId) {
            const futsalAdmin = await User.findOne({ role: 'futsalAdmin', futsal: cancelledCourt.futsalId });
            if (futsalAdmin) {
                const cancellingUser = await User.findById(booking.user).select('name'); // Get user's name
                await createNotification(
                    futsalAdmin._id,
                    'Booking Cancelled by User',
                    `Booking for ${cancelledCourt.name} on ${moment(booking.date).format('YYYY-MM-DD')} at ${booking.startTime} was cancelled by ${cancellingUser?.name || 'the user'}. Reason: ${booking.cancellationReason}`,
                    'booking_cancel_admin',
                    `/admin/bookings?status=cancelled` // Link for admin
                );
                console.log(`[User Cancel POST] Admin notification sent for cancelled booking ${booking._id}`);
            } else {
                 console.warn(`[User Cancel POST] Futsal admin not found for futsal ID ${cancelledCourt.futsalId}`);
            }
        } else {
            console.warn(`[User Cancel POST] Court ${booking.court} or its futsalId not found, cannot notify admin.`);
        }
      } catch (adminNotifyError) {
          console.error(`[User Cancel POST] Error sending admin cancellation notification for booking ${booking._id}:`, adminNotifyError);
      }
      // --- End Notify Futsal Admin (POST variant) ---

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
  // Get all bookings with filters and sorting
  router.get('/admin', auth, async (req, res) => {
    // Ensure user is admin
    if (req.user.role !== 'futsalAdmin' && req.user.role !== 'superAdmin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    try {
      const { 
        status, 
        paymentStatus, 
        startDate, 
        endDate, 
        courtId, 
        sortBy = 'date', 
        sortOrder = 'desc',
        page = 1,
        limit = 10
      } = req.query;

      console.log('Admin Bookings Request:', {
        userRole: req.user.role,
        futsalId: req.user.futsal?._id,
        filters: { status, paymentStatus, startDate, endDate, courtId }
      });

      const filter = {};

      // For futsal admins, only show bookings for their futsal facility
      if (req.user.role === 'futsalAdmin') {
        // First get all courts belonging to this futsal
        const courts = await Court.find({ futsalId: req.user.futsal._id }).select('_id');
        const courtIds = courts.map(court => court._id);
        
        console.log('Futsal Admin Courts:', {
          futsalId: req.user.futsal._id,
          courtCount: courts.length,
          courtIds: courtIds
        });
        
        // If a specific court is selected, ensure it belongs to the admin's futsal
        if (courtId) {
          if (!courtIds.includes(courtId)) {
            return res.status(403).json({ message: 'Unauthorized: You can only view bookings for your futsal courts' });
          }
          filter.court = courtId;
        } else {
          // If no specific court selected, show all bookings for the futsal's courts
          filter.court = { $in: courtIds };
        }
      }

      // Apply filters
      if (status && status !== 'all') filter.status = status;
      if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;

      if (startDate || endDate) {
        filter.date = {};
        if (startDate) {
          try {
            filter.date.$gte = startOfDay(new Date(startDate));
          } catch { /* ignore invalid date */ }
        }
        if (endDate) {
          try {
            filter.date.$lte = endOfDay(new Date(endDate));
          } catch { /* ignore invalid date */ }
        }
        // If only one date was invalid or missing, remove the date filter part
        if (Object.keys(filter.date).length === 0) delete filter.date;
      }

      console.log('Final Filter:', filter);

      // Get total count for pagination
      const total = await Booking.countDocuments(filter);
      console.log('Total Bookings Found:', total);

      // Get paginated bookings with proper population
      const bookings = await Booking.find(filter)
        .populate({
          path: 'user',
          select: 'firstName lastName email contactNumber'
        })
        .populate({
          path: 'court',
          select: 'name futsalId',
          populate: {
            path: 'futsalId',
            select: 'name'
          }
        })
        .sort({ date: -1, startTime: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

      console.log('Bookings Retrieved:', bookings.length);

      // Transform the bookings
      const transformedBookings = bookings.map(booking => ({
        ...booking,
        userInfo: {
          name: [booking.user?.firstName, booking.user?.lastName].filter(Boolean).join(' ') || 'N/A',
          email: booking.user?.email || 'N/A',
          phone: booking.user?.contactNumber || 'N/A'
        },
        courtDetails: {
          name: booking.court?.name || 'N/A',
          futsalName: booking.court?.futsalId?.name || 'N/A'
        }
      }));

      res.json({
        bookings: transformedBookings,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Error fetching admin bookings:', error);
      res.status(500).json({ message: 'Failed to fetch bookings', error: error.message });
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
                method: booking.paymentDetails?.method || 'offline',
                transactionId: booking.paymentDetails?.transactionId || `ADMIN-PAY-${Date.now()}`,
                paidAmount: booking.price,
                paidAt: new Date()
          };
          booking.status = 'confirmed'; // <-- Set booking status to confirmed
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

        // --- Send Payment Confirmation Notification ---
        if (newStatus === 'paid') {
            try {
                const court = await Court.findById(updatedBooking.court).select('name'); // Fetch court name
                await createNotification(
                    updatedBooking.user._id, // Use populated user ID
                    'Payment Confirmed',
                    `Your payment of ${updatedBooking.price} for the booking at ${court?.name || 'the court'} on ${moment(updatedBooking.date).format('YYYY-MM-DD')} ${updatedBooking.startTime} has been confirmed.`,
                    'payment_confirmation', // Specific type
                    `/my-bookings/${updatedBooking._id}`
                );
                 console.log(`[Admin Payment] Sent payment confirmation notification for booking ${updatedBooking._id}`);
            } catch (notificationError) {
                 console.error(`[Admin Payment] Error sending payment confirmation notification for booking ${updatedBooking._id}:`, notificationError);
            }
        }
        // Consider adding notifications for other status changes like 'refunded' or 'failed' if needed
        // --- End Notification ---

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

            // --- Send Loyalty Points Awarded Notification ---
            if (transactionType === 'credit') { // Only notify on credit
                try {
                    const court = await Court.findById(updatedBooking.court).select('name'); // Fetch court name for context
                    const pointsMessage = `You received ${pointsChange} loyalty points for your booking at ${court?.name || 'the court'} on ${moment(updatedBooking.date).format('YYYY-MM-DD')}.`;
                    await createNotification(
                        updatedBooking.user._id,
                        'Loyalty Points Awarded!',
                        pointsMessage,
                        'loyalty_points_received', // New type for loyalty points
                        `/my-profile` // Link to user profile or loyalty section
                    );
                    console.log(`[Loyalty] Sent loyalty points awarded notification for booking ${updatedBooking._id}`);
                } catch (notificationError) {
                    console.error(`[Loyalty] Error sending loyalty points notification for booking ${updatedBooking._id}:`, notificationError);
                }
            }
            // --- End Loyalty Points Notification ---

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
      const adminUserId = req.user._id; // Get admin ID for logging/reason

      // --- Fetch Booking Details BEFORE Deleting for Notification ---
      const bookingToNotify = await Booking.findById(bookingId)
          .populate('user', 'name') // Populate user name
          .populate('court', 'name futsalId'); // Populate court name and futsal ID

      if (!bookingToNotify) {
          return res.status(404).json({ message: 'Booking not found' });
      }

      // For futsal admins, only allow deleting bookings for their own futsal
      if (req.user.role === 'futsalAdmin') {
        // Check if booking belongs to admin's futsal (using pre-fetched booking)
        if (bookingToNotify.court && bookingToNotify.court.futsalId) {
          const bookingFutsalId = bookingToNotify.court.futsalId.toString();
          const adminFutsalId = req.user.futsal._id.toString();
          
          if (bookingFutsalId !== adminFutsalId) {
            return res.status(403).json({ 
              message: 'Unauthorized: You can only delete bookings for your own futsal' 
            });
          }
        } else {
          // Handle case where court or futsalId might be missing (optional, depends on data integrity)
          console.warn(`[Admin Delete] Booking ${bookingId} court or futsalId missing.`);
          // Decide if deletion should proceed or be blocked
          // return res.status(500).json({ message: 'Cannot verify futsal ownership due to missing data.' }); 
        }
      }

      // --- Send Cancellation Notification to Player ---
      try {
          const bookingDateFormatted = moment(bookingToNotify.date).format('YYYY-MM-DD');
          const courtName = bookingToNotify.court?.name || 'the court';
          const cancellationMessage = `Your booking for ${courtName} on ${bookingDateFormatted} at ${bookingToNotify.startTime} has been cancelled by the administration.`;
          
          await createNotification(
              bookingToNotify.user._id, 
              'Booking Cancelled by Admin',
              cancellationMessage,
              'booking_status_change', // Use generic status change type
              `/my-bookings` // Link to general bookings page
          );
          console.log(`[Admin Delete] Sent cancellation notification to user ${bookingToNotify.user._id} for booking ${bookingId}`);
      } catch (notificationError) {
          console.error(`[Admin Delete] Failed to send cancellation notification for booking ${bookingId}:`, notificationError);
          // Decide if you want to proceed with deletion even if notification fails
          // return res.status(500).json({ message: 'Failed to send notification before deleting booking.' });
      }
      // --- End Notification ---
      
      // Delete the booking (original logic)
      const deletedBooking = await Booking.findByIdAndDelete(bookingId);
      
      // Check again? (findByIdAndDelete returns the deleted doc or null)
      if (!deletedBooking) {
        // This case might be redundant if bookingToNotify check passed, but good for safety
        console.warn(`[Admin Delete] Booking ${bookingId} found initially but failed findByIdAndDelete.`);
        return res.status(404).json({ message: 'Booking not found or already deleted.' });
      }

      // TODO: Consider making associated TimeSlot available again if deleting means cancelling
      
      res.json({ message: 'Booking successfully deleted', bookingId });
    } catch (error) {
      console.error('Error deleting booking:', error);
      res.status(500).json({
        message: 'Failed to delete booking',
        error: error.message
      });
    }
  });

  // Bulk update status
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
        const { ids, paymentStatus, status } = req.body;
        const updateData = {};
        let notifyStatusChange = null; // Track significant status change

        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (status) updateData.status = status;

        if (Object.keys(updateData).length === 0) {
             return res.status(400).json({ message: 'No valid status to update provided.' });
        }

        // Fetch bookings *before* updating to compare status and get details
        const bookingsToUpdate = await Booking.find({ _id: { $in: ids } }).populate('court', 'name');
        if (!bookingsToUpdate || bookingsToUpdate.length === 0) {
            return res.status(404).json({ message: 'No matching bookings found.' });
        }
        
        // Determine final update payload and if status changed significantly
        if (paymentStatus === 'paid') {
            updateData.paymentStatus = 'paid';
            updateData['paymentDetails.paidAt'] = new Date(); 
            updateData['paymentDetails.method'] = 'offline-bulk';
            updateData.status = 'confirmed'; // Force confirm on paid
            notifyStatusChange = 'confirmed'; // Mark for notification
        } else if (status === 'cancelled') {
            updateData.status = 'cancelled';
            updateData.cancellationReason = 'Cancelled by admin';
            updateData.cancellationDate = new Date();
            notifyStatusChange = 'cancelled'; // Mark for notification
        } else if (status === 'confirmed') {
             updateData.status = 'confirmed';
             notifyStatusChange = 'confirmed'; // Mark for notification
        } else if (status === 'completed') { // <-- Handle 'completed' status
            updateData.status = 'completed';
            notifyStatusChange = 'completed'; // Mark for notification
        }
        // Add other status updates if needed (e.g., 'pending')

        // Apply the update
        const result = await Booking.updateMany(
            { _id: { $in: ids } }, 
            { $set: updateData }
        );

        // --- Send Notifications for Status Changes --- 
        if (notifyStatusChange) { // Only send if status changed to confirmed or cancelled
            try {
                for (const oldBooking of bookingsToUpdate) {
                    // Check if THIS booking's status actually changed to the target status
                    if (oldBooking.status !== notifyStatusChange) {
                       const bookingDateFormatted = oldBooking.date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                       const courtName = oldBooking.court?.name || 'the court';
                       const userTitle = `Booking ${notifyStatusChange.charAt(0).toUpperCase() + notifyStatusChange.slice(1)}`;
                       const userMessage = `Your booking for ${courtName} on ${bookingDateFormatted}, ${oldBooking.startTime}-${oldBooking.endTime} has been ${notifyStatusChange}.`;
                       
                       await createNotification(
                           oldBooking.user, 
                           userTitle, 
                           userMessage,
                           'booking_status_change', // Generic status change type
                           `/my-bookings/${oldBooking._id}` // <-- Link to specific booking
                       );
                    } 
                    // Optionally add payment confirmation notification if paymentStatus changed to 'paid'
                    // This is tricky in bulk, better handled by single payment route or separate logic
                }
            } catch(notificationError) {
                console.error('[Admin Bulk Status] Failed to send user notifications:', notificationError);
            }
        }
        // --- End Notifications ---

        // TODO: Loyalty points for 'paid' status update

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

        // --- Send Bulk Cancellation Notifications ---
        try {
            for (const booking of bookingsToCancel) {
                const court = await Court.findById(booking.court).select('name'); // Get court name
                const user = await User.findById(booking.user).select('name'); // Get user name
                await createNotification(
                    booking.user,
                    'Booking Cancelled by Admin',
                    `Your booking for ${court?.name || 'the court'} on ${moment(booking.date).format('YYYY-MM-DD')} ${booking.startTime} was cancelled by the administration. Reason: ${cancellationReason}`,
                    'booking_status_change', // Use status change type
                    `/my-bookings` // General link is okay here
                );
            }
            console.log(`[Bulk Cancel] Sent ${bookingsToCancel.length} cancellation notifications to users.`);
        } catch (notificationError) {
            console.error('[Bulk Cancel] Failed to send user notifications:', notificationError);
            // Don't fail the entire operation if notifications fail
        }
        // --- End Notifications ---

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