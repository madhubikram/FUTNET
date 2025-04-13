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

const log = khaltiService.log; // Use the logger from the service
const PAYMENT_TIMEOUT_MINUTES = 15; // Configurable payment window

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

        // 6. Handle Khalti Response
        if (khaltiResult.success) {
            log('INFO', context, `Khalti initiation successful. Updating DB with PIDX for OrderID: ${purchase_order_id}`);
            item.pidx = khaltiResult.pidx;
            item.paymentDetails = { // Initialize payment details
                method: 'khalti'
            };
            await item.save();
            return {
                success: true,
                payment_url: khaltiResult.payment_url,
                purchase_order_id: purchase_order_id
            };
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
        let notificationMessage = '';
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
                notificationMessage = `There was an issue verifying your payment for ${internalPurchaseOrderId} (amount mismatch). Please contact support.`;
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
                notificationMessage = detailedUserNotificationMessage; // Use the detailed message
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
                   // Add loyalty point logic here or call a separate service
                }

                // --- Notify Admin START --- 
                if (itemType === 'booking') {
                    const court = await Court.findById(item.court).populate('futsalId', 'name').select('futsalId name');
                     if (court?.futsalId) { 
                         const futsalAdmin = await User.findOne({ role: 'futsalAdmin', futsal: court.futsalId._id });
                         if (futsalAdmin) {
                             await createNotification(
                                 futsalAdmin._id,
                                 'Booking Payment Confirmed', // Title for admin
                                 // Adjust message for admin with detailed court/futsal info
                                 `Payment of Rs. ${khaltiAmount/100} confirmed for booking by ${item.userName || 'user'} at ${court.futsalId.name} - ${court.name} on ${moment(item.date).format('YYYY-MM-DD')} at ${item.startTime}. Booking is now confirmed.`,
                                 'payment_received_admin', // Specific type for admin payment notification
                                 `/admin/bookings?bookingId=${item._id}` // Link for admin
                             );
                             log('INFO', context, `Admin notification sent to ${futsalAdmin._id} for confirmed booking payment ${item._id}`);
                         } else {
                             log('WARN', context, `Futsal admin not found for futsal ID ${court.futsalId._id} to notify about confirmed payment ${item._id}`);
                         }
                     } else {
                         log('WARN', context, `Court ${item.court} or its futsalId not found/populated. Cannot notify admin about payment.`);
                     }
                } else if (itemType === 'tournament') {
                     // TODO: Add admin notification logic for tournament registration payment confirmation
                     // Similar to booking: find tournament owner/admin, create notification
                     log('INFO', context, 'Admin notification for tournament payment confirmation is not yet implemented.');
                }
                 // --- Notify Admin END --- 
            }
        } else {
            // --- Khalti Status is NOT Completed --- 
            log('WARN', context, `Khalti status is not 'Completed' (${khaltiStatus}) for PIDX: ${pidx}. Marking internal record as FAILED.`);
            item.paymentStatus = 'failed';
            item.paymentDetails = { ...(item.paymentDetails || {}), method: 'khalti', transactionId, paidAmount: khaltiAmount !== null ? khaltiAmount / 100 : undefined, failureReason: failureReason || `Khalti status: ${khaltiStatus}` };
            finalStatus = itemType === 'booking' ? 'cancelled' : 'withdrawn'; // Decide policy
            item.status = finalStatus;
            paymentStatus = 'failed';
            notificationTitle = 'Payment Failed';
            notificationMessage = `Your payment for ${internalPurchaseOrderId} could not be completed (Status: ${khaltiStatus}). Please try again or contact support.`;
            notificationType = 'payment_failed';
        }

        // Clear reservation expiry regardless of outcome once verified/attempted
        item.reservationExpiresAt = undefined;

        // Save the updated record
        await item.save();
        log('INFO', context, `Saved final status for ItemID: ${item._id}. PaymentStatus: ${item.paymentStatus}, Status: ${item.status}`);

        // Send notification
        if (userToNotify && notificationTitle) {
            try {
                await createNotification(
                    userToNotify,
                    notificationTitle,
                    notificationMessage, // This now uses the potentially detailed message
                    notificationType,
                    notificationLink
                );
                 log('INFO', context, `Sent notification to user ${userToNotify} regarding payment status for PIDX: ${pidx}.`);
            } catch (notifyError) {
                 log('ERROR', context, `Failed to send payment status notification to user ${userToNotify} for PIDX: ${pidx}.`, notifyError);
            }
        }

        return { success: paymentStatus === 'paid', finalStatus: item.status }; // Return success based on whether payment was marked as 'paid'

    } catch (error) {
        log('ERROR', context, `Error updating record status for PIDX: ${pidx}.`, { message: error.message, stack: error.stack });
        // Don't use received_purchase_order_id here as it might be unreliable
        return { success: false, error: `Internal DB error during verification update: ${error.message}`, statusCode: 500 };
    }
};

module.exports = {
    initiatePaymentFlow, // Export for internal use
    verifyPayment // Export for route
}; 