// controllers/tournament.controller.js
const Tournament = require('../models/tournament.model');
const fs = require('fs').promises;
const path = require('path');

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
    }
};

module.exports = tournamentController;