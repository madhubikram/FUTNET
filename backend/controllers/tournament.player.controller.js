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
    const requestedTournamentId = req.params.id; // Get ID from request
    const userId = req.user?._id;
    log('INFO', context, `[STEP 1 - START] Registration attempt. User: ${userId}, Requested Tournament ID: ${requestedTournamentId}`);

    try {
      const tournament = await Tournament.findById(requestedTournamentId);
      if (!tournament) {
        log('WARN', context, `[STEP 1 - FAIL] Tournament not found for ID: ${requestedTournamentId}. User: ${userId}`);
        return res.status(404).json({ message: 'Tournament not found' });
      }
      const actualTournamentId = tournament._id;
      log('INFO', context, `[STEP 1 - FOUND] Found Tournament: ${tournament.name} (${actualTournamentId}). User: ${userId}`);

      // --- DEADLINE CHECK --- 
      try {
        const now = new Date();
        const deadlineDateTime = new Date(`${tournament.registrationDeadline.toISOString().split('T')[0]}T${tournament.registrationDeadlineTime || '23:59:59'}`); // Add seconds for inclusivity
        if (now > deadlineDateTime) {
          log('WARN', context, `[STEP 1 - FAIL] Registration denied: Deadline passed for Tournament ${actualTournamentId}. Deadline: ${deadlineDateTime.toISOString()}, Now: ${now.toISOString()}`);
          return res.status(400).json({ message: 'Registration deadline has passed.' });
        }
        log('INFO', context, `[STEP 1 - DEADLINE OK] Deadline check passed for Tournament ${actualTournamentId}.`);
      } catch(e) {
         log('ERROR', context, `[STEP 1 - FAIL] Error parsing deadline date/time for Tournament ${actualTournamentId}`, e);
         // Decide if you want to block registration on parsing error, or allow cautiously
         return res.status(500).json({ message: 'Error checking registration deadline.' }); 
      }
      // --- END DEADLINE CHECK --- 

      // Check if tournament is full
      if (tournament.registeredTeams >= tournament.maxTeams) {
        log('WARN', context, `[STEP 1 - FAIL] Registration denied: Tournament ${actualTournamentId} is full (${tournament.registeredTeams}/${tournament.maxTeams}). User: ${userId}`);
        return res.status(400).json({ message: 'Tournament is full' });
      }

      // Check existing registration
      const existingRegistration = await TournamentRegistration.findOne({
        tournament: actualTournamentId, // Use the confirmed ID
        user: userId
      });
      if (existingRegistration) {
         log('WARN', context, `[STEP 1 - FAIL] Registration denied: User ${userId} already registered/pending for Tournament ${actualTournamentId}. Reg Status: ${existingRegistration.status}, Payment Status: ${existingRegistration.paymentStatus}`);
        return res.status(400).json({ message: 'Already registered or payment pending for this tournament' });
      }

      log('INFO', context, `[STEP 1 - CHECK BODY] Registration request body for User ${userId}:`, req.body);
      if (!req.body.players || !Array.isArray(req.body.players) || req.body.players.length < tournament.teamSize) {
         log('WARN', context, `[STEP 1 - FAIL] Validation failed: Incorrect player data format/count. User: ${userId}, Tournament ${actualTournamentId}. Required: ${tournament.teamSize}, Provided: ${req.body.players?.length}`);
        return res.status(400).json({ message: `Requires ${tournament.teamSize} players.` });
      }

      // Generate Team ID
      const timestamp = Date.now().toString().slice(-6);
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const tournamentPrefix = tournament.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
      const teamId = `TRN-${tournamentPrefix}-${timestamp}-${randomNum}`;

      // Create Registration Data
      const registrationData = {
        tournament: actualTournamentId, 
        user: userId,
        teamId: teamId,
        teamName: req.body.teamName,
        players: req.body.players,
        status: 'pending_payment',
        paymentStatus: 'pending'
      };
      log('INFO', context, `[STEP 2 - CREATE PENDING] Creating pending registration document with data:`, { 
          tournamentId: registrationData.tournament, 
          userId: registrationData.user, 
          teamId: registrationData.teamId, 
          status: registrationData.status 
      });

      const registration = new TournamentRegistration(registrationData);
      const savedRegistration = await registration.save();
      const savedRegistrationId = savedRegistration._id;
      log('INFO', context, `[STEP 2 - SUCCESS] Saved pending registration record. Registration ID: ${savedRegistrationId}, Tournament ID: ${savedRegistration.tournament}`);

       // Initiate Payment or Handle Free
       if (tournament.registrationFee && tournament.registrationFee > 0) {
            log('INFO', context, `[STEP 3 - PAYMENT INIT] Tournament ${actualTournamentId} requires payment (${tournament.registrationFee}). Initiating Khalti flow for Registration ID: ${savedRegistrationId}.`);
            const initiationResult = await initiatePaymentFlow('tournament', savedRegistrationId, userId);

            if (initiationResult.success) {
                log('INFO', context, `[STEP 3 - PAYMENT SUCCESS] Payment initiation successful for Registration ID: ${savedRegistrationId}. Sending payment URL to frontend.`);
                res.status(201).json({
                    message: 'Registration pending. Please complete payment.',
                    registrationId: savedRegistrationId,
                    paymentUrl: initiationResult.payment_url,
                    purchaseOrderId: initiationResult.purchase_order_id
                });
            } else {
                log('ERROR', context, `[STEP 3 - PAYMENT FAIL] Payment initiation failed for Registration ID: ${savedRegistrationId}. Deleting pending registration.`, { error: initiationResult.error });
                await TournamentRegistration.findByIdAndDelete(savedRegistrationId);
                res.status(500).json({ message: `Failed to initiate payment: ${initiationResult.error}` });
            }
       } else {
           log('INFO', context, `[STEP 3 - FREE] Tournament ${actualTournamentId} is free. Confirming Registration ID: ${savedRegistrationId}.`);
           savedRegistration.status = 'active';
           savedRegistration.paymentStatus = 'paid';
           savedRegistration.paymentDetails = { method: 'free', paidAmount: 0, paidAt: new Date() };
           await savedRegistration.save();
           log('INFO', context, `[STEP 3 - FREE] Updated Registration ${savedRegistrationId} status to active/paid.`);
           
           // Update tournament count
           log('INFO', context, `[STEP 3 - FREE] Incrementing registered teams for Tournament ID: ${actualTournamentId}.`);
           await Tournament.findByIdAndUpdate(actualTournamentId, { $inc: { registeredTeams: 1 } });
           log('INFO', context, `[STEP 3 - FREE] Incremented registered teams count successfully.`);

           // Optional: Send notification...

           res.status(201).json({
               message: 'Registration successful (Free Tournament).',
               registration: savedRegistration
           });
       }

    } catch (error) {
      log('ERROR', context, `[STEP - FAIL] Error registering for tournament ${requestedTournamentId}. User ${userId}.`, { message: error.message, stack: error.stack });
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