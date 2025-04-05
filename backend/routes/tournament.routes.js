// routes/tournament.routes.js
console.log('Loading tournament routes...'); // <--- ADD THIS LOG AT THE VERY TOP
try {
    const express = require('express');
    const router = express.Router();
    const tournamentController = require('../controllers/tournament.controller');
    const auth = require('../middleware/auth.middleware');
    const { tournamentUpload } = require('../config/multer');

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

    console.log('Tournament routes loaded'); // <--- ADD THIS LOG AT THE VERY END of the file
    module.exports = router;
} catch (error) {
    console.error('Error loading tournament routes:', error); // <--- ADD ERROR CATCH LOG
    module.exports = {}; // Export an empty object in case of error - to prevent further issues
}