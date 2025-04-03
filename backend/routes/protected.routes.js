// D:\Islington\Sem 5\FYP\Development\FutNet\backend\routes\protected.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const User = require('../models/user.model');
const Futsal = require('../models/futsal.model'); // Ensure Futsal model is required if needed elsewhere
const bcrypt = require('bcryptjs'); // <--- ADD BCRYPT IMPORT

console.log('Loading protected routes...');

// Test route
router.get('/test-protected', (req, res) => {
    res.json({ message: 'Protected routes working' });
});

// Get user profile WITH populated futsal data
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('futsal');

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

// Update user profile (PATCH)
router.patch('/profile', auth, async (req, res) => {
  try {
    const allowedUpdates = ['firstName', 'lastName', 'username', 'email', 'contactNumber']; // <--- Added username
    const updates = {};
    let hasEmailOrContactOrUsernameChanged = false; // <--- Renamed variable

    for (const key in req.body) {
        if (allowedUpdates.includes(key)) {
            updates[key] = req.body[key];
             // Check if email, contactNumber, or username is being changed
            if ((key === 'email' && req.body[key] !== req.user.email) ||
                (key === 'contactNumber' && req.body[key] !== req.user.contactNumber) ||
                (key === 'username' && req.body[key] !== req.user.username)) { // <--- Added username check
                hasEmailOrContactOrUsernameChanged = true;
            }
        }
    }

    // If email, contactNumber, or username changed, check for uniqueness
    if (hasEmailOrContactOrUsernameChanged) {
        const orConditions = [];
        if (updates.email && updates.email !== req.user.email) {
            orConditions.push({ email: updates.email });
        }
        if (updates.contactNumber && updates.contactNumber !== req.user.contactNumber) {
            orConditions.push({ contactNumber: updates.contactNumber });
        }
         if (updates.username && updates.username !== req.user.username) { // <--- Added username condition
            orConditions.push({ username: updates.username });
        }

        if (orConditions.length > 0) {
            const existingUser = await User.findOne({
                _id: { $ne: req.user._id }, // Exclude current user
                $or: orConditions
            });

            if (existingUser) {
                let errorMessage = '';
                if (existingUser.email === updates.email) errorMessage = 'Email already exists';
                else if (existingUser.contactNumber === updates.contactNumber) errorMessage = 'Contact number already registered';
                 else if (existingUser.username === updates.username) errorMessage = 'Username already exists'; // <--- Added username error
                return res.status(400).json({ message: errorMessage });
            }
        }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password').populate('futsal'); // Populate futsal on update too

    if (!updatedUser) {
        return res.status(404).json({ message: 'User not found during update.' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
     // Handle potential duplicate key errors specifically (e.g., if unique index constraint fails)
    if (error.code === 11000) {
        // Determine which field caused the duplicate error
        const field = Object.keys(error.keyValue)[0];
        return res.status(400).json({ message: `The ${field} '${error.keyValue[field]}' is already taken.` });
    }
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// --- *** NEW: Change Password Route *** ---
router.patch('/profile/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Basic validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new passwords are required.' });
        }
        if (newPassword.length < 6) {
             return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
        }

        // Find user (we already have req.user from the auth middleware)
        const user = await User.findById(req.user._id);
        if (!user) {
            // This shouldn't happen if auth middleware worked, but good practice
             return res.status(404).json({ message: 'User not found.' });
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }

        // Hash and save the new password
        // The pre-save hook in the User model will handle hashing
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully.' });

    } catch (error) {
        console.error('Error changing password:', error);
         if (error.name === 'ValidationError') {
            // Mongoose validation errors during save
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        res.status(500).json({ message: 'Failed to change password.', error: error.message });
    }
});
// --- *** END NEW ROUTE *** ---


// --- Admin Verification Routes ---
router.get('/admin/pending-verifications', auth, async (req, res) => {
   // ... (existing logic - no changes needed here) ...
   console.log('Hitting pending-verifications route');
  console.log('User role:', req.user?.role);
  try {
      if (!req.user || req.user.role !== 'superAdmin') {
          console.log('Access denied - User role not superAdmin');
          return res.status(403).json({ message: 'Access denied' });
      }
      const pendingAdmins = await User.find({ role: 'futsalAdmin', verificationStatus: 'pending' }).select('-password');
      const transformedAdmins = pendingAdmins.map(admin => {
          const adminObj = admin.toObject();
          if (adminObj.documents && adminObj.documents.length > 0) {
              adminObj.documents = adminObj.documents.map(doc => {
                  if (doc.startsWith('http')) return doc;
                  // Make sure BASE_URL is defined in your .env or adjust accordingly
                  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
                  return `${baseUrl}${doc.startsWith('/') ? '' : '/'}${doc}`;
              });
          }
          return adminObj;
      });
      console.log('Transformed admins:', transformedAdmins);
      res.json({ admins: transformedAdmins });
  } catch (error) {
      console.error('Error in pending-verifications:', error);
      res.status(500).json({ message: 'Error fetching pending verifications' });
  }
});

router.post('/admin/verify/:id', auth, async (req, res) => {
   // ... (existing logic - no changes needed here) ...
  try {
      if (req.user.role !== 'superAdmin') { return res.status(403).json({ message: 'Access denied' }); }
      const { status } = req.body; // Should be 'approved' or 'rejected'
      const adminId = req.params.id;

       // Validate status
      if (!['approved', 'rejected'].includes(status)) {
           return res.status(400).json({ message: 'Invalid verification status provided.' });
      }

       const updatedUser = await User.findByIdAndUpdate(
          adminId,
          { verificationStatus: status },
          { new: true } // Return the updated document
      );

       if (!updatedUser) {
          return res.status(404).json({ message: 'Admin user not found.' });
      }

       // If rejected, you might want to add logic here to notify the user
      // or mark the account for deletion later, depending on your requirements.

       res.json({ message: `Admin ${status} successfully.` });
    } catch (error) {
        console.error('Error verifying admin:', error);
        res.status(500).json({ message: 'Error updating verification status.' });
     }
});


// Test route
router.get('/test-auth', auth, (req, res) => {
    res.json({ message: 'Auth working', user: { role: req.user.role, id: req.user._id } });
});

console.log('Protected routes loaded');
module.exports = router;