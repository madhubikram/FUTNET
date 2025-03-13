// backend/routes/booking.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const Booking = require('../models/booking.model');
const Court = require('../models/court.model');
const Loyalty = require('../models/loyalty.model');
const User = require('../models/user.model');
const TimeSlot = require('../models/timeSlot.model');

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

        // Check if court exists
        const court = await Court.findById(courtId);
        if (!court) {
            return res.status(404).json({ message: 'Court not found' });
        }

        // Validate date and time
        if (!date || !startTime || !endTime) {
            return res.status(400).json({ message: 'Date and time are required' });
        }

        // Format date properly
        const bookingDate = new Date(date);
        
        // Check if slot is available
        const existingBooking = await Booking.findOne({
            court: courtId,
            date: bookingDate,
            startTime,
            endTime,
            status: { $nin: ['cancelled'] }
        });

        if (existingBooking) {
            return res.status(400).json({ message: 'This time slot is already booked' });
        }

        // Check if court has timeslot available
        const timeslot = await TimeSlot.findOne({
            court: courtId,
            date: bookingDate,
            startTime,
            endTime
        });

        if (!timeslot) {
            return res.status(400).json({ message: 'Timeslot not available' });
        }

        if (timeslot.isBooked) {
            return res.status(400).json({ message: 'This timeslot is already booked' });
        }

        // Create new booking
        const newBooking = new Booking({
            court: courtId,
            user: req.user._id,
            date: bookingDate,
            startTime,
            endTime,
            bookedBy: req.user.name,
            contactEmail: req.user.email,
            contactNumber: req.user.phone || userDetails?.phone || 'No Phone Provided',
            userName: userDetails?.name || req.user.name,
            phone: userDetails?.phone || req.user.phone || 'No Phone Provided',
            email: userDetails?.email || req.user.email,
            status: 'pending',
            paymentStatus: isSlotFree ? 'unpaid' : 'pending', // Set to unpaid or pending based on slot type
            bookedFor
        });

        // Save the booking
        const savedBooking = await newBooking.save();

        // Update timeslot to mark as booked
        timeslot.isBooked = true;
        timeslot.bookedBy = req.user._id;
        await timeslot.save();

        // Update loyalty points for user
        try {
            const loyalty = await Loyalty.findOne({ user: req.user._id });
            if (loyalty) {
                loyalty.points += 10; // Add 10 points for booking
                await loyalty.save();
            } else {
                // Create new loyalty entry if not exists
                const newLoyalty = new Loyalty({
                    user: req.user._id,
                    points: 10
                });
                await newLoyalty.save();
            }
        } catch (err) {
            console.error('Error updating loyalty points:', err);
            // Don't fail the whole request if loyalty update fails
        }

        res.status(201).json(savedBooking);
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
      const bookings = await Booking.find({ user: req.user._id })
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
      const user = await User.findById(req.user._id);
      const freeSlotLimit = 2;
      const freeBookingsUsed = user.freeBookingsUsed || 0;
      const freeBookingsRemaining = Math.max(0, freeSlotLimit - freeBookingsUsed);
      
      res.json({
        freeSlotLimit,
        freeBookingsUsed,
        freeBookingsRemaining
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
      
      // Update booking status
      booking.status = 'cancelled';
      booking.cancellationReason = req.body.reason || 'User cancelled';
      booking.cancellationDate = new Date();
      
      await booking.save();
      
      // If it was a free booking, add it back to the user's free slot allowance
      if (booking.paymentStatus === 'unpaid') {
        // You'll need to implement this logic in your user model
        // For example:
        if (req.user.freeBookingsUsed && req.user.freeBookingsUsed > 0) {
          req.user.freeBookingsUsed -= 1;
          await req.user.save();
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
      
      // Update booking status
      booking.status = 'cancelled';
      booking.cancellationReason = req.body.reason || 'User cancelled';
      booking.cancellationDate = new Date();
      
      await booking.save();
      
      // If it was a free booking, add it back to the user's free slot allowance
      if (booking.paymentStatus === 'unpaid') {
        // You'll need to implement this logic in your user model
        // For example:
        if (req.user.freeBookingsUsed && req.user.freeBookingsUsed > 0) {
          req.user.freeBookingsUsed -= 1;
          await req.user.save();
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
          select: 'name email phone'
        })
        .sort({ date: -1, startTime: 1 });
      
      // Transform bookings for frontend
      const transformedBookings = bookings.map(booking => {
        const bookingObj = booking.toObject();
        
        // Add formatted data for easier frontend display
        bookingObj.formattedDate = booking.date.toLocaleDateString();
        
        // Add court details
        bookingObj.courtDetails = {
          name: booking.court?.name || 'Unknown Court',
          futsalName: booking.court?.futsalId?.name || 'Unknown Futsal',
          surfaceType: booking.court?.surfaceType || 'Unknown',
          courtType: booking.court?.courtType || 'Unknown',
          images: booking.court?.images || []
        };
        
        // Add user details with proper fallbacks from direct booking data
        bookingObj.userDetails = {
          name: booking.user?.name || booking.userName || booking.bookedBy || 'Guest User',
          email: booking.user?.email || booking.email || booking.contactEmail || 'No Email Provided',
          phone: booking.user?.phone || booking.phone || booking.contactNumber || booking.contact || 'No Phone Provided'
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

  // Update booking status (admin only)
  router.patch('/admin/:id/status', auth, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'futsalAdmin' && req.user.role !== 'superAdmin') {
        return res.status(403).json({ message: 'Unauthorized: Admin access required' });
      }
      
      const { status, reason } = req.body;
      const bookingId = req.params.id;
      
      // For futsal admins, only allow updating bookings for their own futsal
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
              message: 'Unauthorized: You can only update bookings for your own futsal' 
            });
          }
        }
      }
      
      // Get the booking first to check if we're cancelling it
      const originalBooking = await Booking.findById(bookingId);
      
      // Update booking status
      const updatedBooking = await Booking.findByIdAndUpdate(
        bookingId, 
        { 
          status, 
          cancellationReason: status === 'cancelled' ? reason : undefined 
        },
        { new: true }
      );
      
      if (!updatedBooking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // If booking was cancelled, update the availability in the timeslot
      if (status === 'cancelled' && originalBooking.status !== 'cancelled') {
        // Make the timeslot available again
        const timeslot = await TimeSlot.findOne({
          court: updatedBooking.court,
          date: updatedBooking.date,
          startTime: updatedBooking.startTime,
          endTime: updatedBooking.endTime
        });
        
        if (timeslot) {
          timeslot.isBooked = false;
          timeslot.bookedBy = null;
          await timeslot.save();
        }
      }
      
      res.json(updatedBooking);
    } catch (error) {
      console.error('Error updating booking status:', error);
      res.status(500).json({
        message: 'Failed to update booking status',
        error: error.message
      });
    }
  });

  // Update payment status (admin only)
  router.patch('/admin/:id/payment', auth, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'futsalAdmin' && req.user.role !== 'superAdmin') {
        return res.status(403).json({ message: 'Unauthorized: Admin access required' });
      }
      
      const { paymentStatus } = req.body;
      
      if (!['pending', 'paid', 'refunded', 'failed', 'unpaid'].includes(paymentStatus)) {
        return res.status(400).json({ message: 'Invalid payment status value' });
      }
      
      const booking = await Booking.findById(req.params.id);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      booking.paymentStatus = paymentStatus;
      
      // If marked as paid, update payment details
      if (paymentStatus === 'paid' && booking.paymentStatus !== 'paid') {
        booking.paymentDetails = {
          ...booking.paymentDetails,
          method: req.body.method || 'offline',
          transactionId: req.body.transactionId || `ADMIN-PAY-${Date.now()}`,
          paidAmount: booking.price,
          paidAt: new Date()
        };
      }
      
      await booking.save();
      
      res.json({
        message: 'Booking payment status updated successfully',
        booking
      });
    } catch (error) {
      console.error('Error updating booking payment status:', error);
      res.status(500).json({
        message: 'Failed to update booking payment status',
        error: error.message
      });
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

module.exports = router;