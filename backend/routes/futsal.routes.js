const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const Futsal = require('../models/futsal.model');
const User = require('../models/user.model');
// Removed multer import as it's not used in this route anymore
// const { upload } = require('../config/multer');

// Removed upload middleware (upload.any())
router.post('/profile', auth, async (req, res) => {
    try {
        console.log('--- Futsal Profile Update Request ---');
        console.log('User:', req.user._id);
        console.log('Request Body:', req.body);

        // --- VALIDATION ---
        if (!req.body.description || typeof req.body.description !== 'string' || req.body.description.trim() === '') {
            return res.status(400).json({ message: 'Missing required field: description' });
        }
        // Validate the nested location object structure
        if (!req.body.location || typeof req.body.location !== 'object' ||
            !req.body.location.address || typeof req.body.location.address !== 'string' || req.body.location.address.trim() === '') {
             console.error('Validation Error: Invalid or missing location.address', req.body.location);
             return res.status(400).json({ message: 'Missing or invalid required field: location address' });
        }

        // Validate coordinates from the nested location object
        const lat = parseFloat(req.body.location?.lat); // Use ?. for safety
        const lng = parseFloat(req.body.location?.lng);

        if (isNaN(lat) || isNaN(lng)) {
             console.error('Validation Error: Invalid coordinates in location object', req.body.location);
            return res.status(400).json({ message: 'Invalid or missing coordinates (latitude/longitude must be numbers)' });
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
             console.error('Validation Error: Coordinates out of range', {lat, lng});
            return res.status(400).json({ message: 'Coordinates are out of valid range.' });
        }

        // Validate simple operatingHours object
        const { opening, closing } = req.body.operatingHours || {};
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!opening || !closing || !timeRegex.test(opening) || !timeRegex.test(closing)) {
             console.error('Validation Error: Invalid operating hours', req.body.operatingHours);
             return res.status(400).json({ message: 'Valid opening and closing times (HH:mm) are required.' });
        }
        // --- END VALIDATION ---

        // --- IMAGE HANDLING REMOVED ---

        // Prepare Futsal Data for DB - MAPPING CORRECTLY
        const futsalData = {
            name: req.body.name || req.user.futsalName, // Use futsalName from user if available
            description: req.body.description.trim(),
            location: req.body.location.address.trim(), // Map address string here
            coordinates: { lat, lng },                 // Map lat/lng object here
            operatingHours: { opening, closing },
            owner: req.user._id,
        };
         // Conditionally add images only if they exist in the request body and are an array
        if (Array.isArray(req.body.images)) {
             futsalData.images = req.body.images;
        }


        console.log('Futsal data to save/update:', futsalData);

        let futsal;
        let isNew = false;
        const existingFutsal = await Futsal.findOne({ owner: req.user._id });

        if (existingFutsal) {
            const updatePayload = { ...futsalData };
            if (!futsalData.images) {
                delete updatePayload.images;
            }
            futsal = await Futsal.findByIdAndUpdate(existingFutsal._id, updatePayload, { new: true, runValidators: true });
            console.log('Futsal profile updated:', futsal._id);
        } else {
             isNew = true;
            // Ensure the futsal name is provided for new entries
            if (!futsalData.name) {
                 console.error('Validation Error: Futsal name is required for new profile creation.');
                 return res.status(400).json({ message: 'Futsal name is required when creating a new profile.' });
            }
            futsal = new Futsal(futsalData);
            await futsal.save();
            console.log('New futsal profile created:', futsal._id);
            await User.findByIdAndUpdate(req.user._id, {
                profileCompleted: true,
                futsal: futsal._id
            }, { new: true });
            console.log('User profile updated with futsal ID and completion status.');
        }

        const updatedUser = await User.findById(req.user._id).populate('futsal');

        res.status(isNew ? 201 : 200).json({
            message: `Futsal profile ${isNew ? 'created' : 'updated'} successfully`,
            futsal,
            user: updatedUser
        });

    } catch (error) {
        console.error('Detailed error in /api/futsal/profile:', error);
        res.status(500).json({
            message: `Failed to save futsal profile: ${error.message}`,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// GET route remains the same
router.get('/profile', auth, async (req, res) => {
  try {
    const futsal = await Futsal.findOne({ owner: req.user._id });
    if (!futsal) {
      return res.status(404).json({ message: 'Futsal profile not found for this user.' });
    }
    res.json(futsal);
  } catch (error) {
    console.error('Error fetching futsal profile:', error);
    res.status(500).json({ message: 'Failed to fetch futsal profile' });
  }
});

module.exports = router;