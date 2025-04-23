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
                .populate({
                    path: 'court',
                    select: 'name futsal surfaceType courtType images', // Select necessary fields
                     populate: { // Populate futsal details within court
                        path: 'futsalId',
                        select: 'name location operatingHours' // Select necessary futsal fields
                    }
                })
                .populate('user', 'name email'); // Populate basic user info

            if (!booking) {
                log('WARN', context, `Booking not found: ${req.params.bookingId}`);
                return res.status(404).json({ message: 'Booking not found' });
            }

            // Check authorization (user owns booking or is admin)
            if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
                 log('WARN', context, `User ${req.user._id} unauthorized to view booking ${req.params.bookingId}`);
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
                     images: courtData.images || [],
                     // Add other required fields if needed
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
            const court = await Court.findById(courtId).populate('futsalId', 'operatingHours'); // Populate operating hours
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
                // Add other relevant fields if needed
            };

            // --- Handle Payment Method --- 
            let finalBooking;
            const purchaseOrderId = `BOOKING-${new mongoose.Types.ObjectId().toString()}`; // Generate unique ID
            bookingData.purchaseOrderId = purchaseOrderId;

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
                // TODO: Notify user/admin
                res.status(201).json({ booking: finalBooking, message: 'Booking confirmed using points.' });

            } else if (paymentMethod === 'free') {
                 // TODO: Implement free slot checking logic similar to the old routes file if needed
                 // For now, assume 'free' means no payment needed and court allows it
                 log('INFO', context, 'Processing as free booking (check logic may be needed).');
                 if (court.requirePrepayment) {
                    log('WARN', context, `User ${userId} attempted free booking on court ${courtId} requiring prepayment.`);
                    return res.status(400).json({ message: 'This court requires prepayment, cannot book as free.' });
                 }
                 bookingData.status = 'confirmed';
                 bookingData.paymentStatus = 'unpaid'; // No payment made/expected
                 bookingData.paymentDetails.method = 'free';
                 bookingData.price = 0; // Price is zero
                 bookingData.priceType = 'free';

                 finalBooking = new Booking(bookingData);
                 await finalBooking.save();
                 log('INFO', context, `Booking ${finalBooking._id} confirmed as free.`);
                // TODO: Notify user/admin
                res.status(201).json({ booking: finalBooking, message: 'Booking confirmed (Free Slot).' });

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
                            purchaseOrderId: purchaseOrderId
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
                 // No prepayment required, confirm booking now
                bookingData.status = 'confirmed';
                bookingData.paymentStatus = 'unpaid'; // User pays at venue
                bookingData.paymentDetails.method = 'offline'; 
                
                finalBooking = new Booking(bookingData);
                await finalBooking.save();
                log('INFO', context, `Booking ${finalBooking._id} confirmed (Offline/Pay Later).`);
                // TODO: Notify user/admin
                res.status(201).json({ booking: finalBooking, message: 'Booking confirmed. Please pay at the venue.' });
            }

        } catch (error) {
            log('ERROR', context, `Unexpected error during booking creation: ${error.message}`, error);
            res.status(500).json({ message: 'An unexpected error occurred while creating the booking.' });
        }
    },

    // DELETE /api/bookings/:bookingId
    cancelBooking: async (req, res) => {
        const context = 'CANCEL_BOOKING';
        const { bookingId } = req.params;
        const userId = req.user._id;
        log('INFO', context, `User ${userId} attempting to cancel booking ${bookingId}`);
        try {
             const booking = await Booking.findById(bookingId);

             if (!booking) {
                log('WARN', context, `Booking ${bookingId} not found for cancellation attempt by user ${userId}.`);
                return res.status(404).json({ message: 'Booking not found' });
             }

             // Authorization: Check if user owns the booking or is an admin
             if (booking.user.toString() !== userId.toString() && req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
                log('WARN', context, `User ${userId} is unauthorized to cancel booking ${bookingId} owned by ${booking.user}.`);
                return res.status(403).json({ message: 'Not authorized to cancel this booking' });
             }
             
             // Check if booking can be cancelled (e.g., not already cancelled or completed)
             if (['cancelled', 'completed'].includes(booking.status)) {
                 log('INFO', context, `Booking ${bookingId} is already ${booking.status} and cannot be cancelled again.`);
                 return res.status(400).json({ message: `Booking is already ${booking.status}` });
             }

             // Use the model's cancel method
             await booking.cancel('Cancelled by user'); // Pass a reason
             
             // TODO: Handle potential refunds (e.g., if prepaid)
             // TODO: Handle loyalty points return if points were used
             // TODO: Update TimeSlot document to mark as available again?

             log('INFO', context, `Booking ${bookingId} successfully cancelled by user ${userId}.`);
             
             // Send notification to Futsal Admin if cancelled by player?
             
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
         // TODO: Implement Admin logic (check req.user.role)
        res.status(501).json({ message: 'Admin update booking status endpoint not implemented.' });
    },

    // POST /api/bookings/debug/create-test
    createTestBooking: async (req, res) => {
        res.status(501).json({ message: 'Debug create test booking not implemented.' });
    },

    // GET /api/bookings/free-slots
    getFreeSlots: async (req, res) => {
        const context = 'GET_FREE_SLOTS';
        const { date, courtId } = req.query;
        const userId = req.user._id;

        if (!date || !courtId) {
            return res.status(400).json({ message: 'Date and Court ID are required parameters.' });
        }
        // TODO: Add stronger date validation if needed

        try {
            log('INFO', context, `Checking free slots for user ${userId}, court ${courtId}, date ${date}`);
            const court = await Court.findById(courtId);

            if (!court) {
                log('WARN', context, `Court not found: ${courtId}`);
                return res.status(404).json({ message: 'Court not found' });
            }

            if (court.requirePrepayment) {
                log('INFO', context, `Court ${courtId} requires prepayment, no free slots applicable.`);
                return res.json({ freeSlotsRemaining: 0, limit: FREE_SLOT_LIMIT_PER_DAY });
            }

            let bookingDateUTC;
            try {
                const [year, month, day] = date.split('-').map(Number);
                bookingDateUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
                if (isNaN(bookingDateUTC.getTime())) throw new Error('Invalid date');
            } catch (e) {
                log('ERROR', context, `Invalid date format received in query: ${date}`, e);
                return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
            }

            const startOfDayUTC = startOfDay(bookingDateUTC); // Use date-fns startOfDay which handles timezone correctly

            let userFreeSlotsRecord = await FreeSlots.findOne({ 
                user: userId, 
                date: startOfDayUTC 
            });

            let freeBookingsRemaining = 0;
            if (userFreeSlotsRecord) {
                freeBookingsRemaining = userFreeSlotsRecord.slotsRemaining || 0;
            } else {
                // If no record, user has all slots available for the day
                freeBookingsRemaining = FREE_SLOT_LIMIT_PER_DAY;
                 // Optionally create the record now, or only when a free slot is used?
                 // Let's assume we only create/update when a free slot is USED in createBooking.
                 log('INFO', context, `No FreeSlots record found for user ${userId} on ${date}, defaulting to ${FREE_SLOT_LIMIT_PER_DAY} slots remaining.`);
            }

            log('INFO', context, `User ${userId} has ${freeBookingsRemaining} free slots remaining for date ${date}.`);
            res.json({ freeSlotsRemaining: freeBookingsRemaining, limit: FREE_SLOT_LIMIT_PER_DAY });

        } catch (error) {
            log('ERROR', context, `Error fetching free slots for user ${userId}, court ${courtId}, date ${date}: ${error.message}`, error);
            // Return 0 slots remaining on error to prevent accidental free bookings
            res.status(500).json({ message: 'Failed to retrieve free slot information.', freeSlotsRemaining: 0, limit: FREE_SLOT_LIMIT_PER_DAY });
        }
    },
};

module.exports = bookingController; 