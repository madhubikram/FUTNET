// Route: /backend/routes/playerCourt.routes.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const Court = require('../models/court.model');
const playerCourtController = require('../controllers/playerCourt.controller');

// Get court details
router.get('/:id', auth, playerCourtController.getCourtDetails);

// Check time slot availability 
router.get('/:id/availability', auth, playerCourtController.checkAvailability);

// Reviews and reactions
router.post('/:id/reviews', auth, playerCourtController.addReview);
router.put('/:id/reviews/:reviewId', auth, playerCourtController.updateReview);
router.delete('/:id/reviews/:reviewId', auth, playerCourtController.deleteReview);
router.post('/:id/reviews/:reviewId/reactions', auth, playerCourtController.toggleReaction);

module.exports = router;