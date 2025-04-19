const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Booking = require('../models/booking.model');
const TournamentRegistration = require('../models/tournament.registration.model');
const Tournament = require('../models/tournament.model'); // Needed for tournament fee
const Court = require('../models/court.model'); // Needed for booking price
const User = require('../models/user.model');
const khaltiService = require('../utils/khalti.service');
const { createNotification } = require('../utils/notification.service'); // For success/failure notifications
const moment = require('moment');
const Loyalty = require('../models/loyalty.model'); // <-- Import Loyalty model
const LoyaltyTransaction = require('../models/loyaltyTransaction.model'); // <-- Import LoyaltyTransaction model

const log = khaltiService.log; // Use the logger from the service
const PAYMENT_TIMEOUT_MINUTES = 15; // Configurable payment window
const PREPAID_POINTS_PER_HOUR = 15; // <-- Define points for prepaid

// Helper function to calculate duration in hours (copied from booking.routes.js)
// TODO: Move this to a shared utility file (e.g., utils/timeUtils.js)
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
        console.error(`[calculateDurationHours] Invalid duration calculated: ${hours} hours for ${startTime} - ${endTime}`);
        return 0; // Return 0 or throw error based on desired handling
      }

      return hours;
    } catch (error) {
        console.error('[calculateDurationHours] Error calculating duration:', error);
        return 0; // Return 0 on error
    }
};

/**
 * INTERNAL FUNCTION
 * Handles the payment initiation flow after an item (booking/registration) is created in a pending state.
 * Generates purchaseOrderId, updates DB, calls Khalti, updates DB with pidx.
 *
 * @param {string} itemType - 'booking' or 'tournament'
 * @param {mongoose.Types.ObjectId} itemId - The ID of the booking or tournament registration record.
 * @param {mongoose.Types.ObjectId} userId - The ID of the user making the payment.
 * @returns {Promise<{success: boolean, payment_url?: string, purchase_order_id?: string, error?: string}>}
 */
const initiatePaymentFlow = async (itemType, itemId, userId) => {
    const context = 'PAYMENT_INITIATE_FLOW';
    log('INFO', context, `[STEP 1 - START] Internal payment initiation. ItemType: ${itemType}, ItemID: ${itemId}, UserID: ${userId}`);

    try {
        let item;
        let amount = 0;
        let purchase_order_name = '';
        let model;
        let expectedDbAmount = 0;
        let actualTournamentId = null; // Variable to store tournament ID for logging

        // 1. Fetch item and details
        log('INFO', context, `[STEP 1 - FETCH] Fetching ${itemType} record with ID: ${itemId}`);
        if (itemType === 'booking') {
            model = Booking;
            item = await model.findById(itemId).populate('court', 'name priceHourly pricePeakHours priceOffPeakHours futsalId');
            if (!item) throw new Error('Booking not found');
            expectedDbAmount = item.price;
             if (typeof expectedDbAmount !== 'number') {
                 log('WARN', context, `[STEP 1 - FETCH] Booking ${itemId} price missing/invalid.`);
                 // Add fallback or throw error
                 expectedDbAmount = item.court?.priceHourly ?? 0; // Simplified fallback
             }
            amount = Math.round(expectedDbAmount * 100);
            purchase_order_name = `Court Booking: ${item.court?.name || 'Court'} on ${moment(item.date).format('YYYY-MM-DD')}`;
            log('INFO', context, `[STEP 1 - FETCHED] Booking ${item._id} fetched. Amount(Paisa): ${amount}`);
        } else if (itemType === 'tournament') {
            model = TournamentRegistration;
            item = await model.findById(itemId).populate({ path: 'tournament', select: 'name registrationFee _id' }); // <<< Fetch tournament ID
            if (!item || !item.tournament) throw new Error('Tournament registration or associated tournament not found');
            actualTournamentId = item.tournament._id; // Store the ID
            expectedDbAmount = item.tournament.registrationFee;
            amount = Math.round(expectedDbAmount * 100);
            purchase_order_name = `Tournament Reg: ${item.tournament.name} - ${item.teamName}`;
            log('INFO', context, `[STEP 1 - FETCHED] Reg ID: ${item._id}, Linked Tournament ID: ${actualTournamentId}, Amount(Paisa): ${amount}`); // Log fetched IDs
        } else {
            throw new Error('Invalid itemType specified');
        }

        if (amount <= 0) {
             log('WARN', context, `[STEP 1 - AMOUNT CHECK] Zero/Negative amount. ItemID: ${itemId}. Type: ${itemType}. Amount: ${expectedDbAmount}.`);
        }

        // 2. Generate purchase order ID and expiry
        const purchase_order_id = `${itemType.toUpperCase()}-${itemId}-${uuidv4().substring(0, 8)}`;
        const reservationExpiresAt = moment().add(PAYMENT_TIMEOUT_MINUTES, 'minutes').toDate();

        // 3. Update DB with purchaseOrderId and expiry
        log('INFO', context, `[STEP 2 - UPDATE PENDING] Updating ${itemType} ${itemId} with PurchaseOrderID: ${purchase_order_id}`);
        item.purchaseOrderId = purchase_order_id;
        item.reservationExpiresAt = reservationExpiresAt;
        item.paymentStatus = 'pending';
        if (itemType === 'booking') item.status = 'pending';
        if (itemType === 'tournament') item.status = 'pending_payment';
        await item.save();
        log('INFO', context, `[STEP 2 - SUCCESS] DB updated.`);

        // 4. Prepare Khalti data
        const user = await User.findById(userId).select('firstName lastName email phone');
        const customer_info = user ? { name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A', email: user.email, phone: user.phone || 'N/A' } : undefined;
        const initiationData = { purchase_order_id, purchase_order_name, amount, website_url: process.env.FRONTEND_URL, customer_info };
        log('INFO', context, `[STEP 3 - KHALTI INIT] Calling Khalti initiate. OrderID: ${purchase_order_id}, Amount: ${amount}`);

        // 5. Call Khalti Service
        const khaltiResult = await khaltiService.initiateKhaltiPayment(initiationData);
        log('DEBUG', context, `[STEP 3 - KHALTI RESULT] Khalti initiation raw result:`, khaltiResult);

        // 6. Handle Khalti Response
        if (khaltiResult.success) {
            log('INFO', context, `[STEP 4 - KHALTI SUCCESS] Khalti OK. Updating ${itemType} ${itemId} with PIDX: ${khaltiResult.pidx}`);
            item.pidx = khaltiResult.pidx;
            item.paymentDetails = { method: 'khalti' };
            await item.save();
            
            const successResult = { success: true, payment_url: khaltiResult.payment_url, purchase_order_id: purchase_order_id };
            log('INFO', context, `[STEP 5 - FLOW SUCCESS] Returning success to caller for ItemID: ${itemId}.`, successResult);
            return successResult;
        } else {
            log('ERROR', context, `[STEP 4 - KHALTI FAIL] Khalti initiation failed. OrderID: ${purchase_order_id}. Reverting status for ${itemType} ${itemId}.`, { error: khaltiResult.error });
            item.paymentStatus = 'failed';
            if (itemType === 'booking') item.status = 'pending'; 
            if (itemType === 'tournament') item.status = 'withdrawn';
            item.purchaseOrderId = undefined; item.pidx = undefined; item.reservationExpiresAt = undefined;
            await item.save();
            log('INFO', context, `[STEP 4 - REVERTED] Status reverted for ${itemType} ${itemId}.`);
            return { success: false, error: khaltiResult.error || 'Khalti initiation failed.' };
        }

    } catch (error) {
        log('ERROR', context, `[STEP - FAIL] Internal error during payment initiation flow. ItemID: ${itemId}.`, { message: error.message, stack: error.stack });
        try {
            let model = (itemType === 'booking') ? Booking : TournamentRegistration;
            await model.findByIdAndUpdate(itemId, { $set: { paymentStatus: 'failed' }, $unset: { purchaseOrderId: "", pidx: "", reservationExpiresAt: "" } });
        } catch (dbError) { log('ERROR', context, `[STEP - FAIL] Failed to mark item as failed after error. ItemID: ${itemId}.`, { dbError: dbError.message }); }
        return { success: false, error: `Internal server error during initiation: ${error.message}` };
    }
};

/**
 * ROUTE CONTROLLER
 * Verifies Khalti payment based on pidx received from frontend after callback.
 */
const verifyPayment = async (req, res) => {
    const { pidx } = req.body;
    const context = 'PAYMENT_VERIFY';
    const userId = req.user?._id;

    log('INFO', context, `Verification request received from UserID: ${userId || 'N/A'}. PIDX: ${pidx}`);

    if (!pidx) {
        log('WARN', context, 'PIDX missing in verification request body.');
        return res.status(400).json({ success: false, message: 'PIDX is required for verification.' });
    }

    try {
        // 1. Call Khalti Verification Service
        const verificationResult = await khaltiService.verifyKhaltiPayment(pidx);

        if (!verificationResult.success) {
            log('ERROR', context, `Khalti verification API call failed for PIDX: ${pidx}.`, { error: verificationResult.error });
            await updateRecordStatusBasedOnVerification(pidx, null, context, 'failed'); // Pass null for received_purchase_order_id
            return res.status(400).json({ success: false, message: `Khalti verification failed: ${verificationResult.error}` });
        }

        // 2. Process Khalti Verification Response (Extract data, DO NOT fail if purchase_order_id is missing from Khalti response)
        const { status: khaltiStatus, transaction_id, total_amount /*, data: khaltiData */ } = verificationResult;
        // const purchase_order_id_from_khalti = khaltiData?.purchase_order_id; // We don't rely on this

        log('INFO', context, `Khalti lookup successful for PIDX: ${pidx}. Khalti Status: ${khaltiStatus}, Amount: ${total_amount}`);

        // 3. Update Database Record (Pass null for received_purchase_order_id as it's not needed here)
        const updateResult = await updateRecordStatusBasedOnVerification(pidx, null, context, khaltiStatus, null, total_amount, transaction_id);

        // 4. Respond to Frontend
        if (updateResult.success) {
            log('INFO', context, `Verification successful and DB updated for PIDX: ${pidx}. Responding to frontend.`);
            res.json({ success: true, message: 'Payment verified successfully.', status: updateResult.finalStatus });
        } else {
            log('ERROR', context, `Verification failed during DB update for PIDX: ${pidx}. Responding to frontend.`, { error: updateResult.error });
            res.status(updateResult.statusCode || 500).json({ success: false, message: updateResult.error || 'Payment verification failed.' });
        }

    } catch (error) {
        log('ERROR', context, `Unexpected error during payment verification for PIDX: ${pidx}.`, { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Internal server error during verification.' });
    }
};

// --- Helper function to update DB based on verification --- 
const updateRecordStatusBasedOnVerification = async (pidx, received_purchase_order_id, context, khaltiStatus, failureReason = null, khaltiAmount = null, transactionId = null) => {
    context = 'PAYMENT_UPDATE_DB'; // More specific context
    log('INFO', context, `[STEP 1 - START] Updating DB based on verification. PIDX: ${pidx}, Khalti Status: ${khaltiStatus}`);
    try {
        let item = null;
        let model = null;
        let itemType = null;
        let expectedDbAmount = 0;
        let userToNotify = null;
        let notificationTitle = '';
        let notificationText = '';
        let notificationType = '';
        let finalStatus = ''; 
        let paymentStatus = 'failed'; 
        let notificationLink = '/my-bookings';
        let actualTournamentId = null; // Variable to store tournament ID

        // Find internal record using PIDX
        log('INFO', context, `[STEP 1 - FIND BY PIDX] Searching for record with PIDX: ${pidx}`);
        item = await Booking.findOne({ pidx }).populate('court', 'name priceHourly');
        if (item) {
            model = Booking;
            itemType = 'booking';
            expectedDbAmount = item.price;
            log('INFO', context, `[STEP 1 - FOUND] Found Booking record by PIDX: ${item._id}`);
        } else {
            // Ensure tournament field is populated when finding registration
            item = await TournamentRegistration.findOne({ pidx }).populate({ path: 'tournament', select: 'name registrationFee _id' }); // <<< Populate tournament ID
            if (item) {
                model = TournamentRegistration;
                itemType = 'tournament';
                if (!item.tournament) {
                    log('ERROR', context, `[STEP 1 - FAIL] Found Reg ID ${item._id} but its associated tournament is missing/null. Cannot proceed.`);
                    // Handle this critical error - maybe mark as failed?
                    return { success: false, error: `Registration ${item._id} is missing tournament link.`, statusCode: 500 };
                }
                actualTournamentId = item.tournament._id; // Store ID
                expectedDbAmount = item.tournament.registrationFee;
                notificationLink = '/my-tournaments';
                log('INFO', context, `[STEP 1 - FOUND] Found Reg record ${item._id} by PIDX. Linked Tournament ID: ${actualTournamentId}`); // Log IDs
            } 
        }
        
        if (!item) {
            log('ERROR', context, `[STEP 1 - FAIL] Could not find internal record matching PIDX: ${pidx}. Cannot update status.`);
            return { success: false, error: `Internal record not found for PIDX: ${pidx}.`, statusCode: 404 };
        }

        const internalPurchaseOrderId = item.purchaseOrderId;
        log('INFO', context, `[STEP 2 - CHECK STATUS] Record Found. Type: ${itemType}, ID: ${item._id}, DB OrderID: ${internalPurchaseOrderId}. Current PaymentStatus: ${item.paymentStatus}`);
        userToNotify = item.user;

        if (item.paymentStatus === 'paid') {
             log('WARN', context, `[STEP 2 - SKIP] Transaction already marked as paid. PIDX: ${pidx}, ItemID: ${item._id}. Skipping update.`);
             return { success: true, finalStatus: item.status, message: 'Already paid' };
        }
        
        // --- Core Verification Logic --- 
        if (khaltiStatus === 'Completed') {
            const amountInPaisa = khaltiAmount; 
            const expectedAmountPaisa = Math.round(expectedDbAmount * 100);
            log('INFO', context, `[STEP 3 - VERIFY AMOUNT] Khalti status Completed. Amount(Paisa): ${amountInPaisa}, Expected(Paisa): ${expectedAmountPaisa}. PIDX: ${pidx}`);

            if (amountInPaisa === null || amountInPaisa !== expectedAmountPaisa) {
                // Amount Mismatch
                log('ERROR', context, `[STEP 3 - AMOUNT FAIL] AMOUNT MISMATCH/MISSING! PIDX: ${pidx}. Marking FAILED.`);
                item.paymentStatus = 'failed';
                item.paymentDetails = { ...(item.paymentDetails || {}), method: 'khalti', transactionId, paidAmount: amountInPaisa !== null ? amountInPaisa / 100 : undefined, paidAt: new Date(), failureReason: 'Amount mismatch or missing' };
                finalStatus = itemType === 'booking' ? 'cancelled' : 'withdrawn';
                item.status = finalStatus; 
                paymentStatus = 'failed';
                notificationTitle = 'Payment Verification Issue';
                notificationText = `Amount mismatch verifying payment for ${internalPurchaseOrderId}. Contact support.`;
                notificationType = 'payment_failed';
            } else {
                // --- SUCCESS CASE --- 
                log('INFO', context, `[STEP 3 - SUCCESS] Payment Completed & Amount OK. PIDX: ${pidx}. Updating DB for ${itemType} ${item._id}.`);
                item.paymentStatus = 'paid';
                item.paymentDetails = { method: 'khalti', transactionId, paidAmount: amountInPaisa / 100, paidAt: new Date() };
                finalStatus = itemType === 'booking' ? 'confirmed' : 'active';
                item.status = finalStatus;
                paymentStatus = 'paid';
                // --- UNSET reservationExpiresAt --- 
                item.reservationExpiresAt = undefined; 
                log('INFO', context, `[STEP 3 - SUCCESS] Unsetting reservationExpiresAt for PIDX: ${pidx} to prevent TTL deletion.`);
                // --- End Unset ---
                notificationTitle = 'Payment Successful!';
                notificationText = `Payment confirmed for ${internalPurchaseOrderId}. Your ${itemType} is confirmed.`; 
                notificationType = 'payment_confirmation';

                // Increment registered teams count for tournaments
                if (itemType === 'tournament') {
                   if (!actualTournamentId) { // Double check we have the ID
                       log('ERROR', context, `[STEP 3 - SUCCESS] Cannot increment team count because Tournament ID is missing for Reg ID ${item._id}!`);
                   } else {
                       log('INFO', context, `[STEP 3 - SUCCESS] Incrementing registered teams for Tournament ID: ${actualTournamentId} (from Reg ID: ${item._id})`);
                       try {
                          await Tournament.findByIdAndUpdate(actualTournamentId, { $inc: { registeredTeams: 1 } });
                          log('INFO', context, `[STEP 3 - SUCCESS] Incremented team count OK for Tournament ID: ${actualTournamentId}`);
                       } catch (incError) {
                          log('ERROR', context, `[STEP 3 - SUCCESS] FAILED to increment team count for Tournament ID: ${actualTournamentId}`, incError);
                       }
                   }
                }
                // Award loyalty points for paid bookings (if applicable)
                if (itemType === 'booking') {
                   // --- START: Award Loyalty Points for PREPAID Booking ---
                   try {
                       const durationHours = calculateDurationHours(item.startTime, item.endTime);
                       if (durationHours > 0) {
                           // Fetch court to check if this was an optional prepayment (for courts that don't require prepayment)
                           const court = await Court.findById(item.court).select('requirePrepayment name');
                           const isOptionalPrepayment = court && !court.requirePrepayment;
                           
                           if (isOptionalPrepayment) {
                               log('INFO', context, `This is an optional prepayment for court ${court.name} (doesn't require prepayment). Awarding bonus points.`);
                           }
                       }
                   } catch (detailError) {
                       log('ERROR', context, `Failed to fetch court details for user notification for booking ${item._id}`, detailError);
                       // Keep default message if details fail
                   }
                }
            }
        } else {
            // --- FAILURE CASE (Khalti status not Completed) --- 
            log('ERROR', context, `[STEP 3 - KHALTI FAIL] Khalti status is ${khaltiStatus}. Marking FAILED. PIDX: ${pidx}`);
            item.paymentStatus = 'failed';
            item.paymentDetails = { ...(item.paymentDetails || {}), method: 'khalti', transactionId, paidAmount: khaltiAmount !== null ? khaltiAmount / 100 : undefined, paidAt: new Date(), failureReason: failureReason || `Khalti status: ${khaltiStatus}` };
            finalStatus = itemType === 'booking' ? 'cancelled' : 'withdrawn'; 
            item.status = finalStatus;
            paymentStatus = 'failed';
            notificationTitle = 'Payment Verification Issue';
            notificationText = `Payment verification failed for ${internalPurchaseOrderId}. Khalti Status: ${khaltiStatus}.`;
            notificationType = 'payment_failed';
        }

        // --- SAVE & NOTIFY --- 
        log('INFO', context, `[STEP 4 - SAVE] Saving ${itemType} ${item._id}. Final Status: ${item.status}, Payment Status: ${item.paymentStatus}.`);
        item.paymentStatus = paymentStatus; 
        item.status = finalStatus;         
        // reservationExpiresAt is already set to undefined in success case above
        await item.save();
        log('INFO', context, `[STEP 4 - SAVED] Record ${item._id} saved.`);

        if (failureReason && paymentStatus === 'failed') { notificationText += ` Reason: ${failureReason}`; }

        log('INFO', context, `[STEP 5 - NOTIFY] Sending notification. User: ${userToNotify}, Title: ${notificationTitle}`);
        await createNotification(userToNotify, notificationTitle, notificationText, notificationType, notificationLink);

        return { success: paymentStatus === 'paid', finalStatus, message: notificationText }; // Return success based on final payment status

    } catch (error) {
        log('ERROR', context, `[STEP - FAIL] Internal error during DB update. PIDX: ${pidx}.`, { message: error.message, stack: error.stack });
        return { success: false, error: `Internal server error during verification update: ${error.message}` };
    }
};

module.exports = {
    initiatePaymentFlow, // Export for internal use by other controllers
    verifyPayment       // Export for the payment route
};
