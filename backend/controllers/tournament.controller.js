// controllers/tournament.controller.js
const Tournament = require('../models/tournament.model');
const fs = require('fs').promises;
const path = require('path');
const TournamentRegistration = require('../models/tournament.registration.model');

// Helper function to delete file
const deleteFile = async (filePath) => {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        console.error('Error deleting file:', error);
    }
};

const tournamentController = {
    createTournament: async (req, res) => {
        try {
            console.log('Creating tournament with data:', {
                body: req.body,
                file: req.file,
                user: req.user
            });

            // Explicitly parse prize fields
            const prizes = {
                first: req.body['prizes.first'] ? Number(req.body['prizes.first']) : 0,
                second: req.body['prizes.second'] ? Number(req.body['prizes.second']) : 0,
                third: req.body['prizes.third'] ? Number(req.body['prizes.third']) : 0
            };

            const tournamentData = {
                ...req.body, // Spread other fields
                banner: req.file ? `/uploads/tournaments/${req.file.filename}` : null,
                futsalId: req.user.futsal,
                prizes: prizes, // Assign the parsed prizes object
                registrationDeadlineTime: req.body.registrationDeadlineTime, // Explicitly include if needed
                // Ensure numeric fields are numbers
                minTeams: Number(req.body.minTeams),
                maxTeams: Number(req.body.maxTeams),
                teamSize: Number(req.body.teamSize),
                substitutes: Number(req.body.substitutes),
                registrationFee: Number(req.body.registrationFee),
                halfDuration: Number(req.body.halfDuration),
                breakDuration: Number(req.body.breakDuration)
            };

            // Remove the flattened prize fields if they exist from spread
            delete tournamentData['prizes.first'];
            delete tournamentData['prizes.second'];
            delete tournamentData['prizes.third'];
            
            console.log('Processed tournament data for creation:', tournamentData);

            const tournament = new Tournament(tournamentData);
            await tournament.save(); // Pre-save hook calculates prizePool here

            console.log('Tournament created successfully:', tournament);
            res.status(201).json(tournament);
        } catch (error) {
            console.error('Error creating tournament:', error);
            // Send back validation details if available
            if (error.name === 'ValidationError') {
                return res.status(400).json({ message: 'Validation Failed', errors: error.errors });
            }
            res.status(400).json({ message: `Error creating tournament: ${error.message}` });
        }
    },

    getTournaments: async (req, res) => {
        try {
            const tournaments = await Tournament.find({ futsalId: req.user.futsal });
            res.json(tournaments);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getTournament: async (req, res) => {
        try {
            const tournament = await Tournament.findOne({
                _id: req.params.id,
                futsalId: req.user.futsal
            });
            if (!tournament) {
                return res.status(404).json({ message: 'Tournament not found' });
            }
            res.json(tournament);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    updateTournament: async (req, res) => {
        try {
            console.log('Updating tournament with data:', {
                 body: req.body,
                 file: req.file,
                 user: req.user
            });

             // Explicitly parse prize fields
             const prizes = {
                 first: req.body['prizes.first'] ? Number(req.body['prizes.first']) : 0,
                 second: req.body['prizes.second'] ? Number(req.body['prizes.second']) : 0,
                 third: req.body['prizes.third'] ? Number(req.body['prizes.third']) : 0
             };

            const updateData = {
                ...req.body,
                prizes: prizes, // Assign parsed prizes object
                registrationDeadlineTime: req.body.registrationDeadlineTime, // Explicitly include if needed
                // Ensure numeric fields are numbers
                minTeams: Number(req.body.minTeams),
                maxTeams: Number(req.body.maxTeams),
                teamSize: Number(req.body.teamSize),
                substitutes: Number(req.body.substitutes),
                registrationFee: Number(req.body.registrationFee),
                halfDuration: Number(req.body.halfDuration),
                breakDuration: Number(req.body.breakDuration)
            };

            if (req.file) {
                // Handle banner update - potentially delete old banner
                const oldTournament = await Tournament.findById(req.params.id);
                if (oldTournament && oldTournament.banner) {
                    const oldBannerPath = path.join(__dirname, '..', oldTournament.banner);
                    await deleteFile(oldBannerPath).catch(err => console.error("Failed to delete old banner:", err));
                }
                updateData.banner = `/uploads/tournaments/${req.file.filename}`;
            }
            
            // Remove flattened prize fields
            delete updateData['prizes.first'];
            delete updateData['prizes.second'];
            delete updateData['prizes.third'];

            console.log('Processed tournament data for update:', updateData);

            const tournament = await Tournament.findOneAndUpdate(
                { _id: req.params.id, futsalId: req.user.futsal },
                updateData,
                { new: true, runValidators: true } // Ensure validators run on update
            );

            if (!tournament) {
                return res.status(404).json({ message: 'Tournament not found' });
            }

            console.log('Tournament updated successfully:', tournament);
            res.json(tournament);
        } catch (error) {
            console.error('Error updating tournament:', error);
            if (error.name === 'ValidationError') {
                return res.status(400).json({ message: 'Validation Failed', errors: error.errors });
            }
            res.status(400).json({ message: `Error updating tournament: ${error.message}` });
        }
    },

    deleteTournament: async (req, res) => {
        try {
            const tournament = await Tournament.findOneAndDelete({
                _id: req.params.id,
                futsalId: req.user.futsal
            });

            if (!tournament) {
                return res.status(404).json({ message: 'Tournament not found' });
            }

            res.json({ message: 'Tournament deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getTournamentRegistrations: async (req, res) => {
        try {
            const tournamentId = req.params.id;
            const userId = req.user._id;
            const userRole = req.user.role;
            
            console.log(`[DEBUG] Fetching registrations for tournament: ${tournamentId} by user ${userId} (role: ${userRole})`);
            
            // Basic validation for tournament existence
            const tournamentExists = await Tournament.findById(tournamentId);
            if (!tournamentExists) {
                console.log(`[ERROR] Tournament ${tournamentId} not found`);
                return res.status(404).json({ message: 'Tournament not found' });
            }

            console.log(`[DEBUG] Tournament found: ${tournamentExists._id}, owned by futsal: ${tournamentExists.futsalId}, user's futsal: ${req.user.futsal}`);

            // Check permissions with detailed logging
            let hasAccess = false;
            
            // Case 1: User is ANY futsal admin - temporarily allow all futsal admins access
            if (userRole === 'futsalAdmin') {
                hasAccess = true;
                console.log(`[DEBUG] Access granted: User is a futsal admin`);
                
                // Just log ownership status but don't restrict access
                if (tournamentExists.futsalId && req.user.futsal && 
                    tournamentExists.futsalId.toString() === req.user.futsal.toString()) {
                    console.log(`[DEBUG] Note: User is the owner of this tournament`);
                } else {
                    console.log(`[DEBUG] Note: User is NOT the owner of this tournament`);
                }
            } 
            // Case 2: User is player and is registered for this tournament
            else if (userRole === 'player') {
                // Check if player is registered for this tournament
                const playerRegistered = await TournamentRegistration.exists({
                    tournament: tournamentId,
                    user: userId
                });
                
                if (playerRegistered) {
                    hasAccess = true;
                    console.log(`[DEBUG] Access granted: User is player registered for this tournament`);
                } else {
                    console.log(`[DEBUG] Access denied: User is player but NOT registered for this tournament`);
                }
            }
            
            if (!hasAccess) {
                console.log(`[ERROR] Access denied: User ${userId} does not have permission to view registrations`);
                return res.status(403).json({ message: 'Forbidden: You do not have permission to view these registrations' });
            }

            // Get registrations
            console.log(`[DEBUG] Searching for registrations with tournament: ${tournamentId}`);
            
            const registrations = await TournamentRegistration.find({
                tournament: tournamentId
            }).populate('user', 'username');

            console.log(`[DEBUG] Found ${registrations.length} registrations for tournament ${tournamentId}`);
            
            // Log the registrations to help with debugging
            if (registrations.length > 0) {
                registrations.forEach((reg, index) => {
                    console.log(`[DEBUG] Registration ${index+1}:`, {
                        id: reg._id,
                        teamName: reg.teamName,
                        userId: reg.user?._id || reg.user,
                        players: Array.isArray(reg.players) ? reg.players.length : 'invalid players array',
                        createdAt: reg.createdAt
                    });
                });
            }
            
            // Always return an array (empty if no registrations)
            res.json(registrations);
        } catch (error) {
            console.error('[ERROR] Error fetching tournament registrations:', error);
            res.status(500).json({ message: `Error fetching registrations: ${error.message}` });
        }
    }
};

module.exports = tournamentController;