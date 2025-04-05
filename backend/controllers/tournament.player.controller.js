// backend/controllers/tournament.player.controller.js

const Tournament = require('../models/tournament.model');
const TournamentRegistration = require('../models/tournament.registration.model');
const User = require('../models/user.model');

const tournamentPlayerController = {
  getAllTournaments: async (req, res) => {
    try {
      console.log('Fetching tournaments for user:', {
        userId: req.user._id,
        role: req.user.role
      });

      // First verify there are tournaments
      const totalTournaments = await Tournament.countDocuments();
      console.log('Total tournaments in database:', totalTournaments);

      const tournaments = await Tournament.find()
      .populate({
        path: 'futsalId',
        select: 'name location coordinates'
      })
      .sort({ startDate: 1 });


      console.log('Found tournaments:', tournaments);

      // Get user's registrations
      const userRegistrations = await TournamentRegistration.find({
        user: req.user._id
      });

      console.log('User registrations:', userRegistrations);

      const registeredTournamentIds = userRegistrations.map(reg => 
        reg.tournament.toString()
      );

      // Transform tournaments with additional debug logging
      const transformedTournaments = tournaments.map(tournament => {
        const transformed = {
          ...tournament.toObject(),
          isRegistered: registeredTournamentIds.includes(tournament._id.toString())
        };
        console.log('Transformed tournament:', transformed);
        return transformed;
      });

      res.json(transformedTournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      res.status(500).json({ message: error.message });
    }
},

  getTournamentDetails: async (req, res) => {
    try {
      const tournament = await Tournament.findById(req.params.id)
      .populate({
        path: 'futsalId',
        select: 'name location coordinates'
      });

      if (!tournament) {
        return res.status(404).json({ message: 'Tournament not found' });
      }

      // Check if user is registered
      const registration = await TournamentRegistration.findOne({
        tournament: tournament._id,
        user: req.user._id
      });

      const response = {
        ...tournament.toObject(),
        isRegistered: Boolean(registration)
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getMyRegistrations: async (req, res) => {
    try {
      const registrations = await TournamentRegistration.find({
        user: req.user._id
      }).populate('tournament');

      res.json(registrations);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  validatePlayers: async (req, res) => {
    try {
      const { captain, player2 } = req.body;

      const users = await User.find({
        username: { $in: [captain, player2] }
      });

      if (users.length !== 2) {
        return res.status(400).json({
          message: 'One or more players not found'
        });
      }

      res.json({ valid: true });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  registerForTournament: async (req, res) => {
    try {
      const tournament = await Tournament.findById(req.params.id);
      if (!tournament) {
        return res.status(404).json({ message: 'Tournament not found' });
      }
  
      // Check if tournament is full
      if (tournament.registeredTeams >= tournament.maxTeams) {
        return res.status(400).json({ message: 'Tournament is full' });
      }
  
      // Check if user is already registered
      const existingRegistration = await TournamentRegistration.findOne({
        tournament: tournament._id,
        user: req.user._id
      });
  
      if (existingRegistration) {
        return res.status(400).json({ message: 'Already registered for this tournament' });
      }
      
      console.log('Registration request body:', req.body);
      
      // Validate players data format
      if (!req.body.players || !Array.isArray(req.body.players) || req.body.players.length < tournament.teamSize) {
        return res.status(400).json({ 
          message: `This tournament requires at least ${tournament.teamSize} properly formatted player entries.`
        });
      }

      // Generate a unique team ID 
      // Format: TRN-{first 3 chars of tournament name}-{timestamp}-{random 3 digits}
      const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const tournamentPrefix = tournament.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
      const teamId = `TRN-${tournamentPrefix}-${timestamp}-${randomNum}`;
  
      // Create registration with proper player format
      const registration = new TournamentRegistration({
        tournament: tournament._id,
        user: req.user._id,
        teamId: teamId,
        teamName: req.body.teamName,
        players: req.body.players // Make sure frontend is sending the correct player object format
      });
      
      console.log('Creating registration:', {
        tournamentId: tournament._id,
        userId: req.user._id,
        teamId: teamId,
        teamName: req.body.teamName,
        playerCount: req.body.players.length
      });
  
      const savedRegistration = await registration.save();
      console.log('Registration saved with ID:', savedRegistration._id);
  
      // Update tournament registered teams count
      tournament.registeredTeams += 1;
      await tournament.save();
      console.log(`Updated tournament ${tournament._id} registeredTeams to ${tournament.registeredTeams}`);
  
      res.status(201).json(savedRegistration);
    } catch (error) {
      console.error('Error registering for tournament:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = tournamentPlayerController;