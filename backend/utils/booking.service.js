const Booking = require('../models/booking.model');
const { createNotification } = require('./notification.service');

/**
 * Checks a single booking and sends a reminder notification if applicable and not already sent.
 * Note: This function does NOT check the time window itself, it assumes the caller
 * has determined the booking is eligible based on time. It primarily checks status
 * and the reminderSent flag.
 * 
 * @param {string | mongoose.Types.ObjectId | object} bookingInput - Booking ID string, ObjectId, or the full Mongoose booking object (must be populated with 'court' and 'user').
 * @returns {Promise<{success: boolean, message: string, notificationSent: boolean}>} - Result object.
 */
async function sendBookingReminderIfNotSent(bookingInput) {
    let booking;
    let bookingId;

    try {
        // 1. Load booking if ID is provided, otherwise use the provided object
        if (typeof bookingInput === 'string' || bookingInput instanceof require('mongoose').Types.ObjectId) {
            bookingId = bookingInput.toString();
            console.log(`[Booking Service] Received ID: ${bookingId}. Loading booking...`);
            booking = await Booking.findById(bookingId).populate('court', 'name').populate('user', '_id');
        } else if (typeof bookingInput === 'object' && bookingInput._id) {
            booking = bookingInput; // Assume it's a loaded Mongoose object
            bookingId = booking._id.toString();
             // Ensure necessary fields are populated (caller should handle this ideally)
             if (!booking.populated('court') || !booking.populated('user')) {
                console.warn(`[Booking Service] Booking object for ${bookingId} might not have court/user populated.`);
             }
            console.log(`[Booking Service] Received booking object for ID: ${bookingId}`);
        } else {
            throw new Error('Invalid booking input provided.');
        }

        if (!booking) {
            console.error(`[Booking Service] Booking not found for ID: ${bookingId || 'N/A'}.`);
            return { success: false, message: 'Booking not found.', notificationSent: false };
        }
        
        console.log(`[Booking Service] Checking booking ${bookingId}: Status=${booking.status}, ReminderSent=${booking.reminderSent}`);


        // 2. Check conditions: Confirmed and reminder not already sent
        if (booking.status !== 'confirmed') {
            console.log(`[Booking Service] Skipping booking ${bookingId}: Status is not 'confirmed' (${booking.status}).`);
            return { success: true, message: 'Booking not confirmed.', notificationSent: false };
        }
        
        if (booking.reminderSent === true) {
            console.log(`[Booking Service] Skipping booking ${bookingId}: Reminder already sent.`);
            return { success: true, message: 'Reminder already sent.', notificationSent: false };
        }

        if (!booking.user || !booking.user._id) {
            console.error(`[Booking Service] Error: Booking ${bookingId} is missing user information.`);
            return { success: false, message: 'Booking is missing user information.', notificationSent: false };
        }
        
        // 3. Send Notification
         // Use try-catch specifically for notification sending
        try {
            console.log(`[Booking Service] Sending reminder notification for booking ${bookingId} to user ${booking.user._id}...`);
            await createNotification(
                booking.user._id,
                `Booking Reminder: ${booking.court?.name || 'Court'} at ${booking.startTime}`,
                `Your booking for ${booking.court?.name || 'the court'} starts soon at ${booking.startTime} on ${booking.date.toLocaleDateString('en-GB')}.`,
                'booking_reminder',
                `/my-bookings/${booking._id}`
            );
             console.log(`[Booking Service] Notification API call successful for booking ${bookingId}.`);
        } catch (notificationError) {
             console.error(`[Booking Service] Failed to send notification for booking ${bookingId}:`, notificationError);
             // Don't mark as sent if notification failed
             return { success: false, message: `Failed to send notification: ${notificationError.message}`, notificationSent: false };
        }

        // 4. Mark as Sent and Save (only if notification was successful)
        console.log(`[Booking Service] Marking reminderSent=true for booking ${bookingId}...`);
        booking.reminderSent = true;
        await booking.save();
        console.log(`[Booking Service] Successfully marked and saved booking ${bookingId}.`);

        return { success: true, message: 'Reminder sent successfully.', notificationSent: true };

    } catch (error) {
        console.error(`[Booking Service] Error processing booking reminder for input "${bookingId || bookingInput}":`, error);
        return { success: false, message: `Internal server error: ${error.message}`, notificationSent: false };
    }
}

module.exports = {
    sendBookingReminderIfNotSent,
}; 