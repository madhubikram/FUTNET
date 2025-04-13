const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const paymentController = require('../controllers/payment.controller');

// --- Khalti Payment Verification Route ---
// This endpoint is called by the frontend after the user is redirected back from Khalti.
router.post('/khalti/verify', 
    auth, // Ensure user is logged in
    paymentController.verifyPayment 
);

// Note: The initiation endpoint is not exposed directly.
// It's called internally by the booking and tournament registration controllers.

module.exports = router; 