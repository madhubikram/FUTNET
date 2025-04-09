// routes/tournament.routes.js
console.log('Loading tournament routes...'); // <--- ADD THIS LOG AT THE VERY TOP
try {
    const express = require('express');
    const router = express.Router();
    const tournamentController = require('../controllers/tournament.controller');
    const auth = require('../middleware/auth.middleware');
    const { tournamentUpload } = require('../config/multer');
    const { updateSingleTournamentStatus } = require('../utils/tournamentStatus'); // Import the new function
    const Tournament = require('../models/tournament.model');

    // Middleware to check if user is a futsal admin
    const isFutsalAdmin = (req, res, next) => {
        if (req.user.role !== 'futsalAdmin') {
            return res.status(403).json({ message: 'Access denied. Only futsal admins can manage tournaments.' });
        }
        next();
    };

    // Create tournament
    router.post('/',
        auth,
        isFutsalAdmin,
        tournamentUpload.single('banner'),
        (req, res, next) => {
          console.log('Tournament creation request received:', {
            body: req.body,
            file: req.file,
            user: req.user
          });
          next();
        },
        tournamentController.createTournament
      );

    // Get all tournaments for a futsal
    router.get('/',
        auth,
        isFutsalAdmin,
        tournamentController.getTournaments
    );

    // Get single tournament
    router.get('/:id',
        auth,
        isFutsalAdmin,
        tournamentController.getTournament
    );

    // Update tournament
    router.put('/:id',
        auth,
        isFutsalAdmin,
        tournamentUpload.single('banner'),
        tournamentController.updateTournament
    );

    // Update tournament bracket specifically
    router.post('/:id/update-bracket',
        auth,
        isFutsalAdmin,
        tournamentController.updateTournamentBracket
    );

    // Refresh tournament status - new endpoint
    router.post('/:id/refresh-status',
        auth,
        isFutsalAdmin,
        async (req, res) => {
            try {
                const result = await updateSingleTournamentStatus(req.params.id);
                if (result.success) {
                    res.json(result);
                } else {
                    res.status(400).json(result);
                }
            } catch (error) {
                console.error('Error refreshing tournament status:', error);
                res.status(500).json({ success: false, message: 'Server error refreshing tournament status' });
            }
        }
    );

    // Delete tournament
    router.delete('/:id',
        auth,
        isFutsalAdmin,
        tournamentController.deleteTournament
    );

    // Get all registered teams for a specific tournament
    router.get(
      '/:id/registrations',
      auth,
      tournamentController.getTournamentRegistrations
    );

    // Force update tournament status
    router.put("/update-status/:id", auth, isFutsalAdmin, async (req, res) => {
      try {
        const tournamentId = req.params.id;
        const result = await updateSingleTournamentStatus(tournamentId);
        
        return res.status(200).json(result);
      } catch (error) {
        console.error("Error forcing tournament status update:", error);
        return res.status(500).json({ success: false, message: error.message });
      }
    });

    console.log('Tournament routes loaded'); // <--- ADD THIS LOG AT THE VERY END of the file
    module.exports = router;
} catch (error) {
    console.error('Error loading tournament routes:', error); // <--- ADD ERROR CATCH LOG
    module.exports = {}; // Export an empty object in case of error - to prevent further issues
}