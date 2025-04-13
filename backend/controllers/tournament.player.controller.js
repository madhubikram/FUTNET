// backend/controllers/tournament.player.controller.js

const Tournament = require('../models/tournament.model');
const TournamentRegistration = require('../models/tournament.registration.model');
const User = require('../models/user.model');
const { createNotification } = require('../utils/notification.service');
const moment = require('moment');
const { generateSingleEliminationBracket } = require('../utils/bracketGenerator');
const { initiatePaymentFlow } = require('../controllers/payment.controller'); // <-- Import payment initiation
const log = require('../utils/khalti.service').log; // <-- Use shared logger

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

      const now = new Date();
      const updatedTournaments = await Promise.all(tournaments.map(async tournament => {
        let statusChanged = false;
        const originalStatus = tournament.status;

        // First check for cancellation due to low teams after deadline
        try {
          const deadlineDateTime = new Date(`${tournament.registrationDeadline.toISOString().split('T')[0]}T${tournament.registrationDeadlineTime || '23:59'}`);
          if (now > deadlineDateTime && tournament.registeredTeams < tournament.minTeams && tournament.status !== 'Cancelled (Low Teams)') {
            console.log(`[Status Update Player - Low Teams] Tournament ${tournament.name} (${tournament._id}) being cancelled.`);
            tournament.status = 'Cancelled (Low Teams)';
            await tournament.save();
            statusChanged = true;
            console.log(`[Status Update Player - Low Teams] Saved status for ${tournament.name}.`);

            // --- Send Cancellation Notifications (Low Teams) --- 
            try {
                const reason = "due to low team registration";
                const registrations = await TournamentRegistration.find({ tournament: tournament._id }).populate('user', 'name');
                const participants = registrations.map(reg => reg.user).filter(Boolean);
                
                for (const participant of participants) {
                    await createNotification(
                        participant._id,
                        `Tournament Cancelled: ${tournament.name}`,
                        `The tournament "${tournament.name}" has been cancelled ${reason}. Registration fees will be refunded.`,
                        'tournament_cancel', 
                        `/my-profile` 
                    );
                }
                console.log(`[Notification Player - Low Teams] Sent cancellation notifications to ${participants.length} players for ${tournament._id}.`);

                // No need to notify admin here, admin controller handles its own view

            } catch (notifyError) {
                console.error(`[Notification Player - Low Teams] Error sending cancellation notifications for ${tournament._id}:`, notifyError);
            }
            // --- End Notifications ---
            
            return tournament;
          }
        } catch (e) {
          console.error(`[Error Player - Low Teams Check] Could not parse deadline for tournament ${tournament._id}: ${e.message}`);
        }

        // Skip further status updates if already Cancelled
        if (tournament.status === 'Cancelled (Low Teams)') {
          return tournament;
        }

        try {
          const startDateTime = new Date(`${tournament.startDate.toISOString().split('T')[0]}T${tournament.startTime || '00:00'}`);
          const endDateTime = tournament.endDate ? 
            new Date(`${tournament.endDate.toISOString().split('T')[0]}T${tournament.endTime || '23:59'}`) : 
            null;
          
          if (endDateTime && now >= endDateTime && now >= startDateTime) {
            if (tournament.status !== 'Completed') {
               if (originalStatus !== 'Completed') {
                  tournament.status = 'Completed';
                  await tournament.save();
              }
            }
          }
          else if (now >= startDateTime && tournament.status !== 'Ongoing') {
            if (originalStatus !== 'Ongoing') {
                tournament.status = 'Ongoing';
                await tournament.save();
            }
          }
        } catch (e) {
          console.error(`[Error Player - Status Check] Could not parse dates for tournament ${tournament._id}: ${e.message}`);
        }

        return tournament;
      }));

      // Get user's registrations
      const userRegistrations = await TournamentRegistration.find({
        user: req.user._id
      });

      console.log('User registrations:', userRegistrations);

      const registeredTournamentIds = userRegistrations.map(reg => 
        reg.tournament.toString()
      );

      // Transform tournaments with additional debug logging
      const transformedTournaments = updatedTournaments.map(tournament => {
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
      .select('+bracket')
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
    const context = 'TOURNAMENT_REGISTER';
    try {
      const tournament = await Tournament.findById(req.params.id);
      if (!tournament) {
        log('WARN', context, `Tournament not found: ${req.params.id}, User: ${req.user._id}`);
        return res.status(404).json({ message: 'Tournament not found' });
      }

      log('INFO', context, `Registration attempt for Tournament: ${tournament.name} (${tournament._id}), User: ${req.user._id}`);

      // Check if tournament is full
      if (tournament.registeredTeams >= tournament.maxTeams) {
        log('WARN', context, `Registration denied: Tournament ${tournament._id} is full (${tournament.registeredTeams}/${tournament.maxTeams}), User: ${req.user._id}`);
        return res.status(400).json({ message: 'Tournament is full' });
      }

      // Check if user is already registered (including pending payment)
      const existingRegistration = await TournamentRegistration.findOne({
        tournament: tournament._id,
        user: req.user._id
        // No status check needed here, any existing record for this user/tournament is enough
      });

      if (existingRegistration) {
         log('WARN', context, `Registration denied: User ${req.user._id} already registered (or pending) for Tournament ${tournament._id}. Registration Status: ${existingRegistration.status}, Payment Status: ${existingRegistration.paymentStatus}`);
        return res.status(400).json({ message: 'Already registered or payment pending for this tournament' });
      }

      log('INFO', context, `Registration request body for User ${req.user._id}:`, req.body);

      // Validate players data format
      if (!req.body.players || !Array.isArray(req.body.players) || req.body.players.length < tournament.teamSize) {
         log('WARN', context, `Validation failed: Incorrect player data format/count for User ${req.user._id}, Tournament ${tournament._id}. Required: ${tournament.teamSize}, Provided: ${req.body.players?.length}`);
        return res.status(400).json({
          message: `This tournament requires at least ${tournament.teamSize} properly formatted player entries.`
        });
      }

      // --- Create Registration in Pending State FIRST ---
      const timestamp = Date.now().toString().slice(-6);
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const tournamentPrefix = tournament.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
      const teamId = `TRN-${tournamentPrefix}-${timestamp}-${randomNum}`;

      const registration = new TournamentRegistration({
        tournament: tournament._id,
        user: req.user._id,
        teamId: teamId,
        teamName: req.body.teamName,
        players: req.body.players,
        status: 'pending_payment', // Start as pending payment
        paymentStatus: 'pending'
        // purchaseOrderId, pidx, reservationExpiresAt will be set by initiatePaymentFlow
      });

      log('INFO', context, `Creating pending registration for User ${req.user._id}, Tournament ${tournament._id}:`, {
        teamId: teamId,
        teamName: req.body.teamName,
        playerCount: req.body.players.length
      });

      const savedRegistration = await registration.save();
      log('INFO', context, `Saved pending registration record: ${savedRegistration._id}`);

       // --- Initiate Payment Flow --- 
       // Check if registration fee exists and is > 0
       if (tournament.registrationFee && tournament.registrationFee > 0) {
            log('INFO', context, `Tournament ${tournament._id} requires payment (${tournament.registrationFee}). Initiating Khalti flow.`);
            const initiationResult = await initiatePaymentFlow('tournament', savedRegistration._id, req.user._id);

            if (initiationResult.success) {
                log('INFO', context, `Payment initiation successful for registration ${savedRegistration._id}. Sending payment URL to frontend.`);

                 // --- Send Initial Pending Notification --- (Optional)
                try {
                    await createNotification(
                        savedRegistration.user,
                        'Registration Pending Payment',
                        `Your registration for "${tournament.name}" (Team: ${savedRegistration.teamName}) is pending payment. Please complete payment via Khalti.`,                        
                        'tournament_pending', 
                        `/my-tournaments` // Link to user's registrations/tournaments
                    );
                    log('INFO', context, `Sent pending payment notification for registration ${savedRegistration._id}`);
                } catch (notifyError) {
                    log('ERROR', context, `Error sending pending notification for registration ${savedRegistration._id}:`, notifyError);
                }
                // --- End Notification ---

                // Respond with the payment URL
                res.status(201).json({
                    message: 'Registration pending. Please complete payment.',
                    registrationId: savedRegistration._id,
                    paymentUrl: initiationResult.payment_url,
                    purchaseOrderId: initiationResult.purchase_order_id
                });
            } else {
                log('ERROR', context, `Payment initiation failed for registration ${savedRegistration._id}. Deleting pending registration.`, { error: initiationResult.error });
                // If initiation fails, delete the pending registration
                await TournamentRegistration.findByIdAndDelete(savedRegistration._id);
                res.status(500).json({ message: `Failed to initiate payment: ${initiationResult.error}` });
            }
       } else {
           // --- Handle Free Registration --- 
           log('INFO', context, `Tournament ${tournament._id} has no registration fee. Confirming registration directly.`);
           savedRegistration.status = 'active';
           savedRegistration.paymentStatus = 'paid'; // Mark as paid since it's free
           savedRegistration.paymentDetails = { method: 'free', paidAmount: 0, paidAt: new Date() };
           await savedRegistration.save();
           
           // Update tournament registered teams count
           tournament.registeredTeams += 1;
           await tournament.save();
           log('INFO', context, `Incremented registered teams for free tournament ${tournament._id}. New count: ${tournament.registeredTeams}`);

           // --- Send Free Registration Confirmation Notification --- 
           try {
                await createNotification(
                    savedRegistration.user,
                    'Registration Confirmed (Free)',
                    `Your registration for the free tournament "${tournament.name}" (Team: ${savedRegistration.teamName}) is confirmed!`,                        
                    'tournament_confirmation', 
                    `/my-tournaments`
                );
                log('INFO', context, `Sent free registration confirmation notification for ${savedRegistration._id}`);
           } catch (notifyError) {
                log('ERROR', context, `Error sending free registration notification for ${savedRegistration._id}:`, notifyError);
           }
           // --- End Notification ---

           res.status(201).json({
               message: 'Registration successful (Free Tournament).',
               registration: savedRegistration
           });
       }

    } catch (error) {
      log('ERROR', context, `Error registering for tournament ${req.params.id}, User ${req.user._id}:`, { message: error.message, stack: error.stack });
      res.status(500).json({ message: `Error registering for tournament: ${error.message}` });
    }
  },

  getTournamentBracket: async (req, res) => {
    try {
      const tournament = await Tournament.findById(req.params.id, 'bracket status isPublished stats'); // Also get isPublished and stats

      if (!tournament) {
        return res.status(404).json({ message: 'Tournament not found' });
      }

      // Check if bracket is published for player viewing
      if (!tournament.isPublished) {
        return res.status(403).json({ message: 'Tournament bracket has not been published yet' });
      }

      // Check if bracket exists
      if (!tournament.bracket || !tournament.bracket.generated) {
        return res.status(404).json({ message: 'Tournament bracket not generated yet' });
      }

      res.json({ 
        bracket: tournament.bracket,
        stats: tournament.stats || {}
      });
    } catch (error) {
      console.error('Error fetching tournament bracket:', error);
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = tournamentPlayerController;