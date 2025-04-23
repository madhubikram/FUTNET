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
const bookingController = require('../controllers/bookingController'); // Import booking controller

const POINTS_PER_HOUR = 10; // Define the points constant

// --- Admin Routes FIRST (More Specific) ---
// Get all bookings (Admin only)
router.get('/admin/all', auth, bookingController.getAllBookings);

// Get bookings for a specific court (Admin only)
router.get('/court/:courtId', auth, bookingController.getAdminCourtBookings);

// Update booking status (Admin only)
router.put('/:bookingId/status', auth, bookingController.updateBookingStatus);

// --- Player/General Routes SECOND (Less Specific / Parameterized) ---
// Get all bookings for the logged-in user
router.get('/', auth, bookingController.getUserBookings);

// Check court availability
router.get('/availability', auth, bookingController.checkAvailability);

// Get remaining free slots for a user on a specific date/court
router.get('/free-slots', auth, bookingController.getFreeSlots);

// Get specific booking details - MUST BE AFTER specific routes like /free-slots
router.get('/:bookingId', auth, bookingController.getBookingById);

// Create a new booking
router.post('/', auth, bookingController.createBooking);

// Cancel a booking (Player or Admin)
router.delete('/:bookingId', auth, bookingController.cancelBooking);

// Delete booking history (Player only)
router.post('/:bookingId/delete', auth, bookingController.deleteBookingHistory);

// --- Debug Routes ---
router.post('/debug/create-test', auth, bookingController.createTestBooking);


module.exports = router;