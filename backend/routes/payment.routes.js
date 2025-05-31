const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const paymentController = require('../controllers/payment.controller');

// --- Khalti Payment Verification Route ---
// This endpoint is called by the frontend after the user is redirected back from Khalti.
router.post('/khalti/verify', 
    auth, 
    paymentController.verifyPayment 
);

module.exports = router; 