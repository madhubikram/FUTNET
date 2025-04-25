const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const Court = require('../models/court.model');
const multer = require('multer');
const path = require('path');
const Booking = require('../models/booking.model');
const mongoose = require('mongoose');
const { startOfDay, endOfDay } = require('date-fns'); // Import date-fns helpers
const playerCourtController = require('../controllers/playerCourt.controller');
const { uploadToBlob } = require('../utils/blobUpload'); // <<< ADD IMPORT

const verifyMongoose = (req, res, next) => {
    if (!mongoose.connection.readyState) {
        return res.status(500).json({
            message: 'Database connection not established'
        });
    }
    next();
};

// Configure multer for image upload
const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload images only.'), false);
        }
    }
});

// Get all courts for the futsal
router.get('/', auth, async (req, res) => {
    try {
        let courts;
        
        // If user is a futsal admin, show only their courts
        if (req.user.role === 'futsalAdmin') {
            courts = await Court.find({ futsalId: req.user.futsal })
                               .populate('futsalId', 'name location coordinates operatingHours');
        } 
        // If user is a player, show all active courts
        else {
            courts = await Court.find({ status: 'Active' })
                               .populate('futsalId', 'name location coordinates operatingHours');
        }
        
        console.log('Found courts:', courts);
        res.json(courts);
    } catch (error) {
        console.error('Error in GET courts:', error);
        res.status(500).json({ message: error.message });
    }
});

router.get('/settings', auth, async (req, res) => {
    try {
        // Get setting from any court of this futsal
        const court = await Court.findOne({ futsalId: req.user.futsal });
        
        res.json({
            requirePrepayment: court?.requirePrepayment || false
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ 
            message: 'Error fetching settings',
            error: error.message 
        });
    }
});

router.put('/prepayment', auth, async (req, res) => {
    try {
        const { requirePrepayment } = req.body;
        if (typeof requirePrepayment !== 'boolean') {
            return res.status(400).json({ 
                message: 'requirePrepayment must be a boolean value' 
            });
        }

        if (!req.user.futsal) {
            return res.status(400).json({ 
                message: 'No futsal associated with this user' 
            });
        }
        
        const result = await Court.updateMany(
            { futsalId: req.user.futsal },
            { $set: { requirePrepayment } }
        );

        res.json({ 
            message: 'Prepayment setting updated successfully',
            requirePrepayment,
            updatedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error updating prepayment setting:', error);
        res.status(500).json({ 
            message: 'Error updating prepayment setting',
            error: error.message 
        });
    }
});

// Create a new court
router.post('/', auth, upload.array('images', 5), async (req, res) => {
    console.log('User data:', req.user);
    console.log('Received req.body for court creation:', req.body); // Log incoming body
    try {
        // Parse boolean values from the nested facilities object
        const parseBooleans = (obj) => {
            if (!obj) return {}; // Handle cases where facilities might not be sent
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = value === 'true';
            }
            return result;
        };

        // <<< START BLOB UPLOAD >>>
        const courtImageUrls = [];
        if (req.files && req.files.length > 0) {
            console.log(`Attempting to upload ${req.files.length} court images...`);
            try {
                for (const file of req.files) {
                    // Use a path prefix like court-images/<futsalId>/ (req.user.futsal)
                    const blobPathPrefix = `court-images/${req.user.futsal}/`; 
                    const blobUrl = await uploadToBlob('uploads', file.buffer, file.originalname, blobPathPrefix);
                    courtImageUrls.push(blobUrl);
                    console.log(`Uploaded court image: ${blobUrl}`);
                }
            } catch (uploadError) {
                console.error('Error uploading court images to blob storage:', uploadError);
                return res.status(500).json({
                    message: 'Failed to upload court images',
                    error: uploadError.message
                });
            }
        }
        // <<< END BLOB UPLOAD >>>

        const courtData = {
            name: req.body.name,
            futsalId: req.user.futsal,
            dimensionLength: Number(req.body.dimensionLength),
            dimensionWidth: Number(req.body.dimensionWidth),
            surfaceType: req.body.surfaceType,
            courtType: req.body.courtType,
            courtSide: req.body.courtSide,
            priceHourly: Number(req.body.priceHourly),
            status: req.body.status || 'Active',
            hasPeakHours: req.body.hasPeakHours === 'true',
            hasOffPeakHours: req.body.hasOffPeakHours === 'true',
            facilities: parseBooleans(req.body.facilities),
            images: courtImageUrls,
        };

        // Conditionally add peak hours data using nested access
        if (courtData.hasPeakHours) {
            courtData.peakHours = {
                // Use correct nested access with optional chaining
                start: req.body.peakHours?.start,
                end: req.body.peakHours?.end 
            };
            // Ensure pricePeakHours exists before converting
            courtData.pricePeakHours = req.body.pricePeakHours ? Number(req.body.pricePeakHours) : undefined;
        }

        // Conditionally add off-peak hours data using nested access
        if (courtData.hasOffPeakHours) {
             courtData.offPeakHours = {
                 // Use correct nested access with optional chaining
                 start: req.body.offPeakHours?.start,
                 end: req.body.offPeakHours?.end
             };
             // Ensure priceOffPeakHours exists before converting
            courtData.priceOffPeakHours = req.body.priceOffPeakHours ? Number(req.body.priceOffPeakHours) : undefined;
        }
        
        // Add console log right before saving
        console.log('[Court Save] Attempting to save court with data:', JSON.stringify(courtData, null, 2));

        const court = new Court(courtData);
        console.log('Running pre-save hook for court:', court._id);
        await court.save(); // Validation runs here
        console.log('Court saved successfully:', court._id);
        res.status(201).json(court);
    } catch (error) {
        console.error('Error saving court:', error);
        // Check if it's a Mongoose validation error
        if (error.name === 'ValidationError') {
            // Log the specific validation errors
            console.error('Validation Errors:', JSON.stringify(error.errors, null, 2));
        }
        res.status(400).json({ 
            message: error.message, 
            details: error.errors || error 
        });
    }
});

router.get('/:id', auth, verifyMongoose, async (req, res) => {
    try {
        // Log the mongoose readiness state and connection
        console.log('Mongoose ready state:', mongoose.connection.readyState);
        console.log('Attempting to fetch court:', req.params.id);

        // Validate MongoDB ObjectId format using isValidObjectId
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid court ID format'
            });
        }

        const court = await Court.findById(req.params.id)
            .populate({
                path: 'futsalId',
                select: 'name location coordinates'
            })
            .populate({
                path: 'reviews',
                populate: [
                    { path: 'user', select: 'username firstName lastName' },
                    { path: 'replies.adminUser', select: 'username firstName lastName' }
                ]
            });

        if (!court) {
            console.log('Court not found:', req.params.id);
            return res.status(404).json({
                message: 'Court not found'
            });
        }

        // Add extra logging for successful retrieval
        console.log('Successfully retrieved court:', {
            id: court._id,
            name: court.name,
            futsalId: court.futsalId
        });

        res.json(court);

    } catch (error) {
        // Enhanced error logging
        console.error('Court retrieval error:', {
            error: error.message,
            stack: error.stack,
            courtId: req.params.id,
            mongooseState: mongoose.connection.readyState
        });

        res.status(500).json({
            message: 'Error retrieving court',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

router.get('/:id/bookings', auth, async (req, res) => {
    try {
      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({ message: 'Date is required' });
      }
      
      // Parse the date safely
      let requestedDate;
      try {
        requestedDate = new Date(date);
        if (isNaN(requestedDate.getTime())) {
            throw new Error('Invalid date format');
        }
      } catch (e) {
         return res.status(400).json({ message: 'Invalid date format provided' });
      }
      
      // Log the exact date objects used for the query
      const startDate = startOfDay(requestedDate);
      const endDate = endOfDay(requestedDate);
      console.log(`[GET /bookings] Querying date range: GTE=${startDate.toISOString()}, LT=${endDate.toISOString()}`);

      // Use startOfDay and endOfDay for accurate range query
      const bookings = await Booking.find({
        court: req.params.id,
        date: {
          $gte: startDate,
          $lt: endDate 
        },
        status: { $ne: 'cancelled' }
      })
      .populate('user', 'name _id'); // Optionally populate user info if needed by frontend
      
      // Log the result directly from the database query
      console.log(`[GET /bookings] DB query result for court ${req.params.id} on ${date}:`, JSON.stringify(bookings, null, 2));

      console.log(`[GET /bookings] Found ${bookings.length} bookings for court ${req.params.id} on ${date}`);
      res.json(bookings);
      
    } catch (error) {
      console.error('Error fetching court bookings:', error);
      res.status(500).json({
        message: 'Failed to fetch court bookings',
        error: error.message
      });
    }
  });


// Update a court
router.put('/:id', auth, upload.array('images', 5), async (req, res) => {
    try {
        const court = await Court.findById(req.params.id);
        if (!court) {
            return res.status(404).json({ message: 'Court not found' });
        }

        // Ensure the user owns the futsal this court belongs to (Safer Check)
        const userFutsalId = req.user.futsal?._id || req.user.futsal; // Handle object or ID
        if (!userFutsalId || !court.futsalId || court.futsalId.toString() !== userFutsalId.toString()) {
            console.error('[AUTH CHECK FAILED] Comparing Court Futsal ID:', court.futsalId?.toString(), 'with User Futsal ID:', userFutsalId?.toString());
            return res.status(403).json({ message: 'User not authorized to update this court' });
        }

        // Parse boolean values from the nested facilities object
        const parseBooleans = (obj) => {
            if (!obj) return {}; // Handle cases where facilities might not be sent
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = value === 'true';
            }
            return result;
        };

        const updateData = {
            ...req.body,
             // Directly use new dimension fields from form
             dimensionLength: Number(req.body.dimensionLength),
             dimensionWidth: Number(req.body.dimensionWidth),
             surfaceType: req.body.surfaceType, // Already a string from select
             facilities: parseBooleans({
                 changingRooms: req.body['facilities.changingRooms'],
                 lighting: req.body['facilities.lighting'],
                 parking: req.body['facilities.parking'],
                 shower: req.body['facilities.shower']
             }),
             hasPeakHours: req.body.hasPeakHours === 'true',
             hasOffPeakHours: req.body.hasOffPeakHours === 'true',
             peakHours: {
                 start: req.body['peakHours[start]'],
                 end: req.body['peakHours[end]']
             },
             offPeakHours: {
                 start: req.body['offPeakHours[start]'],
                 end: req.body['offPeakHours[end]']
             }
        };
        
        // Remove the old 'dimensions' field if it exists from form data
        delete updateData.dimensions;

        // Convert price strings to numbers
        updateData.priceHourly = Number(updateData.priceHourly);
        if (updateData.hasPeakHours) {
            updateData.pricePeakHours = Number(updateData.pricePeakHours);
        }
        if (updateData.hasOffPeakHours) {
            updateData.priceOffPeakHours = Number(updateData.priceOffPeakHours);
        }

        // Handle image updates
        // <<< START BLOB UPLOAD >>>
        if (req.files && req.files.length > 0) {
            console.log(`Attempting to upload ${req.files.length} new court images for update...`);
            const courtImageUrls = [];
            // Optional: Add logic here to delete old blobs from Azure storage 
            // based on URLs stored in court.images before uploading new ones.
            try {
                for (const file of req.files) {
                    const blobPathPrefix = `court-images/${court.futsalId}/`; // Use existing futsal ID
                    const blobUrl = await uploadToBlob('uploads', file.buffer, file.originalname, blobPathPrefix);
                    courtImageUrls.push(blobUrl);
                    console.log(`Uploaded new court image: ${blobUrl}`);
                }
                updateData.images = courtImageUrls; // Replace existing images with new Blob URLs
            } catch (uploadError) {
                console.error('Error uploading new court images to blob storage:', uploadError);
                // Decide if update should fail
                return res.status(500).json({
                    message: 'Failed to upload new court images',
                    error: uploadError.message
                });
            }
        } else {
            // If no new files are uploaded, the existing updateData.images (if sent in req.body)
            // or the original court.images will be used by findByIdAndUpdate.
            // If you want to explicitly prevent clearing images if none are sent, 
            // ensure updateData.images is not set or removed here.
            // delete updateData.images; // Uncomment this if you DON'T want an empty req.files array to clear images
        }
        // <<< END BLOB UPLOAD >>>

        console.log('Court data being updated:', updateData);

        const updatedCourt = await Court.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        res.json(updatedCourt);
    } catch (error) {
        console.error('Error updating court:', error);
        res.status(400).json({ 
            message: error.message, 
            details: error.errors || error 
        });
    }
});
    
// Delete a court
router.delete('/:id', auth, async (req, res) => {
    try {
        const courtId = req.params.id;
        
        // Handle associated bookings
        const Booking = require('../models/booking.model');
        
        // Mark all future bookings as cancelled and removed from history
        await Booking.updateMany(
            { 
                court: courtId,
                date: { $gte: new Date() }, // Future bookings
                status: { $in: ['pending', 'confirmed'] }
            },
            { 
                status: 'cancelled',
                cancellationReason: 'Court has been removed by the futsal admin',
                cancellationDate: new Date(),
                isDeletedFromHistory: true
            }
        );
        
        // Mark past bookings as deleted from history
        await Booking.updateMany(
            {
                court: courtId,
                date: { $lt: new Date() }, // Past bookings
                status: { $in: ['completed', 'cancelled'] }
            },
            {
                isDeletedFromHistory: true
            }
        );
        
        // Delete timeslots for this court
        const TimeSlot = require('../models/timeSlot.model');
        await TimeSlot.deleteMany({ court: courtId });
        
        // Now delete the court
        await Court.findByIdAndDelete(courtId);
        
        res.json({ 
            message: 'Court deleted successfully. All associated bookings have been cancelled.',
            courtId
        });
    } catch (error) {
        console.error('Error deleting court:', error);
        res.status(500).json({ 
            message: 'An error occurred while deleting the court',
            error: error.message 
        });
    }
});

// --- Review Routes (Mounted under /api/courts) ---

// Add review (players)
router.post('/:id/reviews', auth, playerCourtController.addReview);

// Update review (players)
router.put('/:id/reviews/:reviewId', auth, playerCourtController.updateReview);

// Delete review (players)
router.delete('/:id/reviews/:reviewId', auth, playerCourtController.deleteReview);

// Add reaction (players)
router.post('/:id/reviews/:reviewId/reactions', auth, playerCourtController.toggleReaction);

// Add reply (admins)
router.post('/:id/reviews/:reviewId/replies', auth, playerCourtController.addReplyToReview);

// Update reply (admins)
router.put('/:id/reviews/:reviewId/replies/:replyId', auth, playerCourtController.updateReply);

// Delete reply (admins)
router.delete('/:id/reviews/:reviewId/replies/:replyId', auth, playerCourtController.deleteReply);

// --- End Review Routes ---

module.exports = router;