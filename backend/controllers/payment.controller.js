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
    log('INFO', context, `Starting internal payment initiation. ItemType: ${itemType}, ItemID: ${itemId}, UserID: ${userId}`);

    try {
        let item;
        let amount = 0;
        let purchase_order_name = '';
        let model;
        let expectedDbAmount = 0;

        // 1. Fetch the item and determine details
        if (itemType === 'booking') {
            model = Booking;
            item = await model.findById(itemId).populate('court', 'name priceHourly pricePeakHours priceOffPeakHours futsalId');
            if (!item) throw new Error('Booking not found');
            // Ensure price is correctly determined (use booking price if already set, otherwise calculate)
             expectedDbAmount = item.price;
             if (typeof expectedDbAmount !== 'number') {
                 log('WARN', context, `Booking ${itemId} price is missing or invalid. Attempting calculation based on court.`);
                 // Recalculate based on court - This logic should ideally be robust/shared
                 // For now, assume item.price was correctly set during booking creation
                 if (!item.court) throw new Error('Booking court data not available for price calculation.');
                 expectedDbAmount = item.court.priceHourly; // Simplified fallback
             }
            
            // Debug log the amount being calculated
            log('DEBUG', context, `Calculated amount for Khalti payment for booking ${itemId}:`, {
                expectedDbAmount,
                priceSource: typeof item.price === 'number' ? 'booking.price' : 'court.priceHourly',
                courtId: item.court?._id
            });
            
            amount = Math.round(expectedDbAmount * 100); // Convert to Paisa
            purchase_order_name = `Court Booking: ${item.court?.name || 'Court'} on ${moment(item.date).format('YYYY-MM-DD')}`;

        } else if (itemType === 'tournament') {
            model = TournamentRegistration;
            item = await model.findById(itemId).populate({
                path: 'tournament',
                select: 'name registrationFee'
            });
            if (!item || !item.tournament) throw new Error('Tournament registration or associated tournament not found');
            expectedDbAmount = item.tournament.registrationFee;
            amount = Math.round(expectedDbAmount * 100); // Convert to Paisa
            purchase_order_name = `Tournament Reg: ${item.tournament.name} - ${item.teamName}`;
        } else {
            throw new Error('Invalid itemType specified');
        }

        if (amount <= 0) {
             log('WARN', context, `Attempting to initiate payment for zero or negative amount for ItemID: ${itemId}. Type: ${itemType}. Amount: ${expectedDbAmount}`);
             // Allow zero-amount for free slots/tournaments, but Khalti might reject < 1000 Paisa (Rs 10)
             // If amount is truly 0, we should bypass Khalti, but for this flow, Khalti will likely handle the error.
        }

        // 2. Generate unique purchase order ID and set expiry
        const purchase_order_id = `${itemType.toUpperCase()}-${itemId}-${uuidv4().substring(0, 8)}`;
        const reservationExpiresAt = moment().add(PAYMENT_TIMEOUT_MINUTES, 'minutes').toDate();

        // 3. Update DB record with purchaseOrderId and expiry
        item.purchaseOrderId = purchase_order_id;
        item.reservationExpiresAt = reservationExpiresAt;
        item.paymentStatus = 'pending'; // Ensure it's pending
        if (itemType === 'booking') item.status = 'pending';
        if (itemType === 'tournament') item.status = 'pending_payment';

        await item.save();
        log('INFO', context, `Updated DB with PurchaseOrderID: ${purchase_order_id} and Expiry for ItemID: ${itemId}`);

        // 4. Prepare data for Khalti initiation
        const user = await User.findById(userId).select('firstName lastName email phone'); // Fetch user details
        const customer_info = user ? {
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
            email: user.email,
            phone: user.phone || 'N/A' // Khalti might require phone
        } : undefined;

        const initiationData = {
            purchase_order_id,
            purchase_order_name,
            amount,
            website_url: process.env.FRONTEND_URL, // Your base frontend URL
            customer_info
            // Add amount_breakdown or product_details if needed
        };

        // 5. Call Khalti Service
        const khaltiResult = await khaltiService.initiateKhaltiPayment(initiationData);
        
        // Enhanced logging for Khalti result
        log('DEBUG', context, `Received Khalti initiation result for ${itemType} ${itemId}:`, {
            success: khaltiResult.success,
            hasPaymentUrl: !!khaltiResult.payment_url,
            paymentUrl: khaltiResult.payment_url,
            pidx: khaltiResult.pidx,
            error: khaltiResult.error || 'none'
        });

        // 6. Handle Khalti Response
        if (khaltiResult.success) {
            log('INFO', context, `Khalti initiation successful. Updating DB with PIDX for OrderID: ${purchase_order_id}`);
            item.pidx = khaltiResult.pidx;
            item.paymentDetails = { // Initialize payment details
                method: 'khalti'
            };
            await item.save();
            
            const successResult = {
                success: true,
                payment_url: khaltiResult.payment_url,
                purchase_order_id: purchase_order_id
            };
            
            // Final validation check before returning
            if (!successResult.payment_url) {
                log('ERROR', context, `Payment URL missing in successful Khalti result for ${itemType} ${itemId}. This will break redirection!`);
            }
            
            log('DEBUG', context, `Returning success result from initiatePaymentFlow for ${itemType} ${itemId}:`, successResult);
            return successResult;
        } else {
            log('ERROR', context, `Khalti initiation failed for OrderID: ${purchase_order_id}. Reverting status.`, { error: khaltiResult.error });
            // Revert status or mark as failed immediately
            item.paymentStatus = 'failed';
            if (itemType === 'booking') item.status = 'pending'; // Or maybe 'cancelled'? Decide policy.
            if (itemType === 'tournament') item.status = 'withdrawn'; // Or handle differently
            item.purchaseOrderId = undefined; // Clear purchase ID
            item.pidx = undefined; // Clear pidx
            item.reservationExpiresAt = undefined; // Clear expiry
            await item.save();
            return { success: false, error: khaltiResult.error || 'Khalti initiation failed.' };
        }

    } catch (error) {
        log('ERROR', context, `Internal error during payment initiation flow for ItemID: ${itemId}.`, { message: error.message, stack: error.stack });
        // Attempt to mark item as failed if possible
        try {
            let model = (itemType === 'booking') ? Booking : TournamentRegistration;
            await model.findByIdAndUpdate(itemId, { $set: { paymentStatus: 'failed' }, $unset: { purchaseOrderId: "", pidx: "", reservationExpiresAt: "" } });
        } catch (dbError) {
            log('ERROR', context, `Failed to mark item as failed after error for ItemID: ${itemId}.`, { dbError: dbError.message });
        }
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
    // Note: received_purchase_order_id is the one from the *Khalti callback/lookup*, which might be unreliable or absent.
    // We prioritize finding our record using the verified PIDX.
    try {
        let item = null;
        let model = null;
        let itemType = null;
        let expectedDbAmount = 0;
        let userToNotify = null;
        let notificationTitle = '';
        // Use a different variable name to avoid redeclaration issues
        let notificationText = '';
        let notificationType = '';
        let finalStatus = ''; // Booking/Registration status
        let paymentStatus = 'failed'; // Default payment status
        let notificationLink = '/my-bookings';

        // --- Find internal record using PIDX --- 
        log('INFO', context, `Attempting to find record by PIDX: ${pidx}`);
        item = await Booking.findOne({ pidx }).populate('court', 'name priceHourly'); // Populate needed fields
        if (item) {
            model = Booking;
            itemType = 'booking';
            expectedDbAmount = item.price;
            log('INFO', context, `Found Booking record by PIDX: ${item._id}`);
        } else {
            item = await TournamentRegistration.findOne({ pidx }).populate('tournament', 'name registrationFee');
            if (item) {
                model = TournamentRegistration;
                itemType = 'tournament';
                expectedDbAmount = item.tournament?.registrationFee;
                notificationLink = '/my-tournaments';
                log('INFO', context, `Found TournamentRegistration record by PIDX: ${item._id}`);
            } 
        }
        // --- End PIDX lookup --- 

        // If not found by PIDX, maybe log a warning but proceed cautiously, or fail.
        // For now, we rely on PIDX being stored correctly during initiation.
        if (!item) {
            log('ERROR', context, `Could not find internal record matching PIDX: ${pidx}. Cannot update status.`);
            // It's crucial we find the record. If PIDX wasn't saved or is wrong, we have a problem.
            return { success: false, error: `Internal record not found for PIDX: ${pidx}.`, statusCode: 404 };
        }

        // Get the purchase order ID stored in *our* database record
        const internalPurchaseOrderId = item.purchaseOrderId;
        log('INFO', context, `Found internal record. Type: ${itemType}, ID: ${item._id}, DB OrderID: ${internalPurchaseOrderId}. Current PaymentStatus: ${item.paymentStatus}`);
        userToNotify = item.user;

        // Check if already processed
        if (item.paymentStatus === 'paid') {
             log('WARN', context, `Transaction already marked as paid for PIDX: ${pidx}, ItemID: ${item._id}. Skipping update.`);
             return { success: true, finalStatus: item.status, message: 'Already paid' };
        }
        
        // --- Core Verification Logic --- 
        if (khaltiStatus === 'Completed') {
            const amountInPaisa = khaltiAmount; // Already in Paisa from Khalti
            const expectedAmountPaisa = Math.round(expectedDbAmount * 100);
            
            log('INFO', context, `Khalti status is Completed. Checking amount. Khalti (Paisa): ${amountInPaisa}, Expected (Paisa): ${expectedAmountPaisa}`);

            // Security Check: Verify amount
            if (amountInPaisa === null || amountInPaisa !== expectedAmountPaisa) {
                // Amount Mismatch or missing
                log('ERROR', context, `AMOUNT MISMATCH or missing for PIDX: ${pidx}! Khalti Amount (Paisa): ${amountInPaisa}, Expected (Paisa): ${expectedAmountPaisa}. Marking as FAILED.`);
                item.paymentStatus = 'failed';
                item.paymentDetails = { ...(item.paymentDetails || {}), method: 'khalti', transactionId, paidAmount: amountInPaisa !== null ? amountInPaisa / 100 : undefined, paidAt: new Date(), failureReason: 'Amount mismatch or missing' };
                finalStatus = itemType === 'booking' ? 'cancelled' : 'withdrawn'; // Decide policy
                item.status = finalStatus; 
                paymentStatus = 'failed';
                notificationTitle = 'Payment Verification Issue';
                notificationText = `There was an issue verifying your payment for ${internalPurchaseOrderId} (amount mismatch). Please contact support.`;
                notificationType = 'payment_failed';
            } else {
                // --- SUCCESS CASE --- 
                log('INFO', context, `Payment Completed and Amount Verified for PIDX: ${pidx}. Updating DB.`);
                item.paymentStatus = 'paid';
                item.paymentDetails = { method: 'khalti', transactionId, paidAmount: amountInPaisa / 100, paidAt: new Date() };
                finalStatus = itemType === 'booking' ? 'confirmed' : 'active';
                item.status = finalStatus;
                paymentStatus = 'paid';
                notificationTitle = 'Payment Successful!';
                
                // --- Construct User Notification Message with Details ---
                let detailedUserNotificationMessage = `Your payment for ${internalPurchaseOrderId} was successful! Your ${itemType} is confirmed.`; // Default
                if (itemType === 'booking') {
                    try {
                        // Fetch court details specifically for user notification
                        const bookingCourt = await Court.findById(item.court).populate('futsalId', 'name').select('futsalId name');
                        if (bookingCourt) {
                             const courtName = bookingCourt.name || 'the court';
                             const futsalName = bookingCourt.futsalId?.name || 'the futsal';
                             detailedUserNotificationMessage = `Payment confirmed! Your booking for ${courtName} at ${futsalName} on ${moment(item.date).format('YYYY-MM-DD')} at ${item.startTime} is confirmed.`
                        }
                    } catch (detailError) {
                        log('ERROR', context, `Failed to fetch court details for user notification for booking ${item._id}`, detailError);
                        // Keep default message if details fail
                    }
                }
                // TODO: Add similar logic for tournament user notifications if needed
                notificationText = detailedUserNotificationMessage; // Use the detailed message
                // --- End User Notification Message Construction ---
                
                notificationType = 'payment_confirmation';

                // Increment registered teams count for tournaments
                if (itemType === 'tournament' && item.tournament) {
                   try {
                      await Tournament.findByIdAndUpdate(item.tournament._id, { $inc: { registeredTeams: 1 } });
                      log('INFO', context, `Incremented registered teams for tournament ${item.tournament._id}`);
                   } catch (incError) {
                      log('ERROR', context, `Failed to increment registered teams count for tournament ${item.tournament._id}`, incError);
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
            // --- FAILURE CASE --- 
            log('ERROR', context, `Khalti status is ${khaltiStatus}. Marking as FAILED.`, { khaltiStatus });
            item.paymentStatus = 'failed';
            item.paymentDetails = { ...(item.paymentDetails || {}), method: 'khalti', transactionId, paidAmount: khaltiAmount !== null ? khaltiAmount / 100 : undefined, paidAt: new Date(), failureReason: failureReason || 'Khalti status indicates failure' };
            finalStatus = itemType === 'booking' ? 'cancelled' : 'withdrawn'; // Decide policy
            item.status = finalStatus;
            paymentStatus = 'failed';
            notificationTitle = 'Payment Verification Issue';
            notificationText = `There was an issue verifying your payment for ${internalPurchaseOrderId}. Please contact support.`;
            notificationType = 'payment_failed';
        }

        // Update DB with final status and payment details
        item.paymentStatus = paymentStatus;
        item.paymentDetails = item.paymentDetails || {};
        item.paymentDetails.method = item.paymentDetails.method || 'khalti';
        item.paymentDetails.transactionId = transactionId;
        item.paymentDetails.paidAmount = item.paymentDetails.paidAmount || (khaltiAmount !== null ? khaltiAmount / 100 : undefined);
        item.paymentDetails.paidAt = item.paymentDetails.paidAt || new Date();
        item.paymentDetails.failureReason = item.paymentDetails.failureReason || failureReason;
        item.status = finalStatus;
        await item.save();

        // Final notification message with reason if needed
        if (failureReason) {
            notificationText += ` Reason: ${failureReason}`;
        }

        // Send notification to user
        await createNotification(userToNotify, notificationTitle, notificationText, notificationType, notificationLink);

        return { success: true, finalStatus, message: notificationText };
    } catch (error) {
        log('ERROR', context, `Internal error during verification for PIDX: ${pidx}.`, { message: error.message, stack: error.stack });
        return { success: false, error: `Internal server error during verification: ${error.message}` };
    }
};

module.exports = {
    initiatePaymentFlow, // Export for internal use by other controllers
    verifyPayment       // Export for the payment route
};
