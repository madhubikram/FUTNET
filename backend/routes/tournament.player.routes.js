// backend/routes/tournament.player.routes.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const playerMiddleware = require('../middleware/player.middleware');
const tournamentPlayerController = require('../controllers/tournament.player.controller');

// Apply both auth and player middleware
router.use(auth);
router.use(playerMiddleware);

// Your routes
router.get('/', tournamentPlayerController.getAllTournaments);
router.get('/my-registrations', tournamentPlayerController.getMyRegistrations);
router.get('/:id', tournamentPlayerController.getTournamentDetails);
router.get('/:id/bracket', tournamentPlayerController.getTournamentBracket);
router.post('/:id/register', tournamentPlayerController.registerForTournament);
router.post('/validate-players', tournamentPlayerController.validatePlayers);

module.exports = router;