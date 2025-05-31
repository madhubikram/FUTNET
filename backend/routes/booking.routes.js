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
const { isTimeInRange } = require('../utils/timeUtils');
const LoyaltyTransaction = require('../models/loyaltyTransaction.model');
const moment = require('moment'); 
const { createNotification } = require('../utils/notification.service');
const { initiatePaymentFlow } = require('../controllers/payment.controller'); 
const log = require('../utils/khalti.service').log; 
const { FreeSlots, FREE_SLOT_LIMIT_PER_DAY } = require('../models/freeSlots.model'); 
const bookingController = require('../controllers/bookingController.js');

const POINTS_PER_HOUR = 10; 


router.get('/admin/all', auth, bookingController.getAllBookings);

// Get bookings for a specific court (Admin only)
router.get('/court/:courtId', auth, bookingController.getAdminCourtBookings);

// Admin: Update general booking status (e.g., confirm)
router.patch('/:bookingId/status', auth, bookingController.updateBookingStatus);

// Admin: Update payment status
router.patch('/:bookingId/payment', auth, bookingController.updatePaymentStatus);

// Admin: Cancel a booking
router.patch('/:bookingId/cancel', auth, bookingController.cancelBooking);

// Admin: Reschedule a booking
router.patch('/:bookingId/reschedule', auth, bookingController.rescheduleBooking);

// Admin: Permanently DELETE a booking
// This REPLACES the previous DELETE route which pointed to cancelBooking
router.delete('/:bookingId', auth, bookingController.adminDeleteBooking);


router.get('/', auth, bookingController.getUserBookings);

// Get booking statistics for the logged-in user
router.get('/stats', auth, bookingController.getUserBookingStats);

// Check court availability
router.get('/availability', auth, bookingController.checkAvailability);

// Get remaining free slots for a user on a specific date/court
router.get('/free-slots', auth, bookingController.getFreeSlots);

// Get specific booking details - MUST BE AFTER specific routes like /free-slots
router.get('/:bookingId', auth, bookingController.getBookingById);

// Create a new booking
router.post('/', auth, bookingController.createBooking);

// User: Delete booking from their history (NOT permanent delete)
router.post('/:bookingId/delete', auth, bookingController.deleteBookingHistory);

// --- Debug Routes ---
router.post('/debug/create-test', auth, bookingController.createTestBooking);

module.exports = router;