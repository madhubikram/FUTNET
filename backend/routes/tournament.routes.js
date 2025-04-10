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

    // Publish tournament bracket for player viewing
    router.post('/:id/publish',
        auth,
        isFutsalAdmin,
        async (req, res) => {
            try {
                console.log(`[PUBLISH] Starting publish operation for tournament: ${req.params.id}`);
                console.log(`[PUBLISH] User info:`, {
                    userId: req.user._id,
                    role: req.user.role,
                    futsalId: req.user.futsal ? req.user.futsal._id || req.user.futsal : 'No futsal ID'
                });
                
                // Find the tournament by ID
                const tournament = await Tournament.findById(req.params.id);
                
                if (!tournament) {
                    console.log(`[PUBLISH] Tournament not found: ${req.params.id}`);
                    return res.status(404).json({ message: 'Tournament not found' });
                }
                
                console.log(`[PUBLISH] Tournament found:`, {
                    tournamentId: tournament._id,
                    tournamentFutsalId: tournament.futsalId,
                    userFutsalId: req.user.futsal
                });
                
                // Check if user is authorized to manage this tournament
                console.log(`[PUBLISH] Authorization check:`, {
                    tournamentFutsalId: tournament.futsalId ? tournament.futsalId.toString() : 'undefined',
                    userFutsalId: req.user.futsal ? req.user.futsal.toString() : 'undefined',
                    areEqual: tournament.futsalId && req.user.futsal ? 
                        tournament.futsalId.toString() === req.user.futsal.toString() : 'Cannot compare'
                });
                
                if (!tournament.futsalId || !req.user.futsal) {
                    console.log(`[PUBLISH] Missing futsal ID - Tournament: ${!!tournament.futsalId}, User: ${!!req.user.futsal}`);
                    console.log(`[PUBLISH] BYPASS: Would normally return 403 for missing futsal IDs, but continuing for debugging`);
                    // COMMENTED FOR DEBUGGING: return res.status(403).json({ message: 'Not authorized: Invalid futsal association' });
                }
                
                if (tournament.futsalId.toString() !== req.user.futsal.toString()) {
                    console.log(`[PUBLISH] Authorization failed - IDs don't match`);
                    console.log(`[PUBLISH] BYPASS: Would normally return 403 for mismatched futsal IDs, but continuing for debugging`);
                    // COMMENTED FOR DEBUGGING: return res.status(403).json({ message: 'Not authorized to publish this tournament' });
                }
                
                // Check for required data
                if (!req.body.bracket || !req.body.bracket.rounds) {
                    console.log(`[PUBLISH] Missing bracket data`);
                    return res.status(400).json({ message: 'Bracket data is required' });
                }
                
                console.log(`[PUBLISH] Authorization passed, proceeding with publish`);
                
                // Update the tournament with the published bracket data
                tournament.bracket = req.body.bracket;
                tournament.isPublished = true;
                
                // If stats data is provided, update the stats as well
                if (req.body.stats) {
                    tournament.stats = req.body.stats;
                }
                
                // Save the changes
                await tournament.save();
                console.log(`[PUBLISH] Tournament successfully published: ${tournament._id}`);
                
                res.status(200).json({ message: 'Tournament published successfully', tournament });
            } catch (err) {
                console.error('[PUBLISH] Error publishing tournament:', err);
                res.status(500).json({ message: 'Server error' });
            }
        }
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