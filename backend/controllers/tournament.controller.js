// controllers/tournament.controller.js
const Tournament = require('../models/tournament.model');
const fs = require('fs').promises;
const path = require('path');
const TournamentRegistration = require('../models/tournament.registration.model');
const User = require('../models/user.model');
const { createNotification } = require('../utils/notification.service');
const moment = require('moment');
const { generateSingleEliminationBracket } = require('../utils/bracketGenerator'); // Import generator
const mongoose = require('mongoose'); // Import mongoose for ObjectId validation
const { uploadToBlob, deleteBlob } = require('../utils/blobUpload'); // <<< UPDATE IMPORT

// --- Define Controller Object Early ---
const tournamentController = {};

// Helper function to delete file
const deleteFile = async (filePath) => {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        console.error('Error deleting file:', error);
    }
};

// --- Define Controller Functions and Attach ---

const createTournament = async (req, res) => {
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

            // <<< START BLOB UPLOAD >>>
            let bannerUrl = null;
            if (req.file) {
                console.log(`Attempting to upload tournament banner...`);
                try {
                    // Use a path prefix like tournament-banners/<futsalId>/
                    const blobPathPrefix = `tournament-banners/${req.user.futsal?._id}/`; 
                    if (!req.user.futsal?._id) {
                         console.error("FATAL: Futsal ID not found on req.user during tournament banner upload.");
                         throw new Error("Futsal ID missing for blob path.");
                    }
                    bannerUrl = await uploadToBlob('uploads', req.file.buffer, req.file.originalname, blobPathPrefix);
                    console.log(`Uploaded tournament banner: ${bannerUrl}`);
                } catch (uploadError) {
                    console.error('Error uploading tournament banner to blob storage:', uploadError);
                    // Decide if creation should fail
                    return res.status(500).json({
                        message: 'Failed to upload tournament banner',
                        error: uploadError.message
                    });
                }
            }
            // <<< END BLOB UPLOAD >>>

            const tournamentData = {
                ...req.body, // Spread other fields
                banner: bannerUrl, // <<< ADD THIS LINE (Use Blob URL)
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
            
            // Default endTime if endDate exists and endTime is missing
            if (tournamentData.endDate && !tournamentData.endTime) {
                console.log(`[Create Tournament] endTime missing for endDate ${tournamentData.endDate}. Defaulting endTime to 23:59.`);
                tournamentData.endTime = '23:59';
            }

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
};
tournamentController.createTournament = createTournament;

const getTournaments = async (req, res) => {
        try {
            // Select the bracket field along with other defaults
            const tournaments = await Tournament.find({ futsalId: req.user.futsal }, '+bracket'); 

            // Update status before sending
            const now = new Date();
            const updatedTournaments = await Promise.all(tournaments.map(async tournament => {
                let statusChanged = false; // Flag to track if status was changed in this check
                const originalStatus = tournament.status;

                // First check for cancellation due to low teams after deadline
                try {
                    const deadlineDateTime = new Date(`${tournament.registrationDeadline.toISOString().split('T')[0]}T${tournament.registrationDeadlineTime || '23:59'}`);
                    if (now > deadlineDateTime && tournament.registeredTeams < tournament.minTeams && tournament.status !== 'Cancelled (Low Teams)') {
                        console.log(`[!!!][GET_TOURNAMENTS_CANCEL_CHECK] Running cancellation logic for Tournament ${tournament._id}. Now: ${now.toISOString()}, Deadline: ${deadlineDateTime.toISOString()}, Registered: ${tournament.registeredTeams}, Min: ${tournament.minTeams}`);
                        tournament.status = 'Cancelled (Low Teams)';
                        await tournament.save();
                        statusChanged = true;
                        console.log(`[!!!][GET_TOURNAMENTS_CANCEL_CHECK] Saved status Cancelled for ${tournament.name}.`);

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
                                    'tournament_cancel', // Specific type
                                    `/my-profile` // Link to profile or transactions page
                                );
                            }
                            console.log(`[Notification - Low Teams] Sent cancellation notifications to ${participants.length} players for ${tournament._id}.`);

                            if (tournament.futsalId) {
                                const admin = await User.findOne({ futsal: tournament.futsalId, role: 'futsalAdmin' });
                                if (admin) {
                                    await createNotification(
                                        admin._id,
                                        `Tournament Auto-Cancelled: ${tournament.name}`,
                                    `\"${tournament.name}\" was automatically cancelled ${reason} (${tournament.registeredTeams}/${tournament.minTeams} teams).`,
                                        'tournament_cancel_admin',
                                        `/admin/tournaments/${tournament._id}` 
                                    );
                                    console.log(`[Notification - Low Teams] Sent cancellation notification to admin ${admin._id} for ${tournament._id}.`);
                                }
                            }
                        } catch (notifyError) {
                            console.error(`[Notification - Low Teams] Error sending cancellation notifications for ${tournament._id}:`, notifyError);
                        }
                    // --- End Notifications ---\

                        return tournament; // Return the updated tournament
                    }
                } catch (e) {
                    console.error(`[Error - Low Teams Check] Could not parse deadline for tournament ${tournament._id}: ${e.message}`);
                }

                // Skip further status updates if already Cancelled (including the check above)
                if (tournament.status === 'Cancelled (Low Teams)') {
                    return tournament;
                }

                // --- Other status checks (Ongoing, Completed) - only if not cancelled above --- 
                try {
                    const startDateTime = new Date(`${tournament.startDate.toISOString().split('T')[0]}T${tournament.startTime || '00:00'}`);
                    const endDateTime = tournament.endDate ? 
                        new Date(`${tournament.endDate.toISOString().split('T')[0]}T${tournament.endTime || '23:59'}`) : 
                        null;
                    
                    if (endDateTime && now >= endDateTime && now >= startDateTime) {
                        if (tournament.status !== 'Completed') {
                             if (originalStatus !== 'Completed') { // Avoid redundant logs/saves if already completed
                                tournament.status = 'Completed';
                                await tournament.save();
                                console.log(`[Status Update] Tournament ${tournament.name} (${tournament._id}) status changed to Completed.`);
                                // Note: Notifications for start/end are handled by the separate utility now
                            }
                        }
                    }
                    else if (now >= startDateTime && tournament.status !== 'Ongoing') {
                        if (originalStatus !== 'Ongoing') { // Avoid redundant logs/saves
                            tournament.status = 'Ongoing';
                            await tournament.save();
                            console.log(`[Status Update] Tournament ${tournament.name} (${tournament._id}) status changed to Ongoing.`);
                            // Note: Notifications for start/end are handled by the separate utility now
                        }
                    }
                } catch (e) {
                    console.error(`[Error - Status Check] Could not parse dates for tournament ${tournament._id}: ${e.message}`);
                }

                return tournament;
            }));

            res.json(updatedTournaments);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
};
tournamentController.getTournaments = getTournaments;

const getTournament = async (req, res) => {
        try {
            let tournament = await Tournament.findOne({
                _id: req.params.id,
                futsalId: req.user.futsal
            });
            
            if (!tournament) {
                return res.status(404).json({ message: 'Tournament not found' });
            }

        // --- START BRACKET GENERATION LOGIC (moved to getTournamentDetailsForAdmin) ---
        // This logic is intentionally removed from here as it should likely only run 
        // when the admin specifically views the details page prepared for bracket management.

        // --- START POPULATING TEAM DETAILS for bracket display (moved to getTournamentDetailsForAdmin) ---
        // This logic is also removed for the same reason.

        // If the basic tournament info is needed (without bracket generation/population):
        res.json(tournament); 

    } catch (error) {
        console.error('Error fetching tournament:', error);
        res.status(500).json({ message: error.message });
    }
};
tournamentController.getTournament = getTournament;


const getTournamentDetailsForAdmin = async (req, res) => {
    console.log(`[LOG] Entering getTournamentDetailsForAdmin for Tournament ID: ${req.params.id}`); // Log entry
    try {
        let tournament = await Tournament.findOne({
            _id: req.params.id,
            futsalId: req.user.futsal
        }).select('+bracket');

        if (!tournament) {
            console.log(`[LOG] Tournament ${req.params.id} not found for admin.`);
            return res.status(404).json({ message: 'Tournament not found' });
        }
        console.log(`[LOG] Found tournament ${req.params.id}. Current status: ${tournament.status}`);
        console.log(`[LOG] Tournament Bracket status BEFORE check:`, tournament.bracket ? `Exists, Generated=${tournament.bracket.generated}` : 'null');

            // --- START BRACKET GENERATION LOGIC ---
            const now = new Date();
        let deadlineDateTime = null;
            let deadlinePassed = false;
            try {
             deadlineDateTime = new Date(`${tournament.registrationDeadline.toISOString().split('T')[0]}T${tournament.registrationDeadlineTime || '23:59'}`);
                 deadlinePassed = now > deadlineDateTime;
             console.log(`[LOG] Bracket Check Time: Now=${now.toISOString()}, Deadline=${deadlineDateTime.toISOString()}, Passed=${deadlinePassed}`);
            } catch (e) {
            console.error(`[LOG][ERROR] Could not parse deadline for tournament ${tournament._id}: ${e.message}`);
            }

        const minTeamsMet = tournament.registeredTeams >= tournament.minTeams;
        console.log(`[LOG] Bracket Check Teams: Registered=${tournament.registeredTeams}, MinRequired=${tournament.minTeams}, Met=${minTeamsMet}`);

            const needsBracketGeneration = 
                deadlinePassed &&
            minTeamsMet &&
                (!tournament.bracket || !tournament.bracket.generated);
        
        console.log(`[LOG] Needs Bracket Generation? ${needsBracketGeneration}`);

            if (needsBracketGeneration) {
            console.log(`[LOG] Conditions met for tournament ${tournament._id}. Attempting to generate bracket...`);
                
                const registrationQuery = { tournament: tournament._id, status: 'active' }; // Explicit query
                console.log(`[LOG] Performing query to find active registrations for bracket:`, registrationQuery); // <<< Log the query
                const activeRegistrations = await TournamentRegistration.find(registrationQuery)
                    .populate('user', 'username') // Need usernames for display names potentially
                    .populate('teamId', 'name'); // Need team names

                console.log(`[LOG] Found ${activeRegistrations.length} active registrations from DB query.`); // <<< Log the result count
                
                // Log details if few registrations found (for debugging)
                if (activeRegistrations.length < tournament.minTeams && activeRegistrations.length > 0) {
                    console.log(`[LOG] Details of found registrations (count < minTeams):`, activeRegistrations.map(r => ({ id: r._id, status: r.status, team: r.teamName, user: r.user?.username })));
                } else if (activeRegistrations.length === 0) {
                    console.log(`[LOG] ZERO active registrations found by the query.`);
                }

                if (activeRegistrations.length >= tournament.minTeams) {
                  const teams = activeRegistrations.map(reg => ({
                    _id: reg.teamId?._id || reg._id, // Use team ID if available, else registration ID as fallback key
                    name: reg.teamName || reg.teamId?.name || `Team ${reg._id.toString().slice(-4)}`, // Ensure a name
                    seed: activeRegistrations.length - activeRegistrations.indexOf(reg) // Example seeding
                  }));

                  console.log(`[LOG] Calling generateSingleEliminationBracket with ${teams.length} teams.`);
                  const generatedBracket = generateSingleEliminationBracket(teams, tournament.maxTeams);
                    if (generatedBracket) {
                    console.log(`[LOG] Bracket successfully generated by utility.`);
                        tournament.bracket = generatedBracket;
                    console.log(`[LOG] Saving tournament ${tournament._id} with new bracket...`);
                    await tournament.save();
                    console.log(`[LOG] Tournament ${tournament._id} successfully saved with bracket.`);
                } else {
                    console.error(`[LOG][ERROR] generateSingleEliminationBracket returned null/false for tournament ${tournament._id}`);
                }
            } else {
                console.warn(`[LOG] Conditions met, but couldn't fetch enough active registrations (${activeRegistrations.length}) for ${tournament._id} at the moment of generation check.`);
            }
        } else {
            console.log(`[LOG] Conditions for bracket generation not met or bracket already exists.`);
            }
            // --- END BRACKET GENERATION LOGIC ---

            // --- START POPULATING TEAM DETAILS for bracket display ---
            let registeredTeamsDetails = [];
            if (tournament.bracket?.generated) {
            console.log(`[LOG] Bracket is generated for ${tournament._id}. Fetching registration details for display...`);
                try {
                    registeredTeamsDetails = await TournamentRegistration.find({
                        tournament: tournament._id,
                    status: 'active'
                }).select('teamName teamId _id players');
                console.log(`[LOG] Found ${registeredTeamsDetails.length} registration details for display.`);
                } catch(regError) {
                console.error(`[LOG][ERROR] Error fetching registration details for tournament ${tournament._id}:`, regError);
                }
            }
            // --- END POPULATING TEAM DETAILS ---

        // IMPORTANT FIX: Convert the Mongoose document to a plain JS object 
        // before sending to ensure virtuals and selected fields (like bracket) are included.
        const tournamentToSend = tournament.toObject({ virtuals: true }); 

        console.log(`[LOG] Returning details for tournament ${req.params.id}. Bracket Generated: ${tournamentToSend.bracket?.generated}`);
        res.json({ tournament: tournamentToSend, registeredTeamsDetails });

        } catch (error) {
        console.error(`[LOG][ERROR] Error fetching tournament details for admin ${req.params.id}:`, error);
            res.status(500).json({ message: error.message });
        }
};
tournamentController.getTournamentDetailsForAdmin = getTournamentDetailsForAdmin;

const updateTournament = async (req, res) => {
        try {
            console.log('Updating tournament with data:', {
            params: req.params,
                 body: req.body,
                 file: req.file,
                 user: req.user
            });

        const tournament = await Tournament.findOne({
            _id: req.params.id,
            futsalId: req.user.futsal
        });

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }

        // Explicitly parse prize fields from the request body
        const prizes = {};
        if (req.body['prizes.first'] !== undefined) prizes.first = Number(req.body['prizes.first']);
        if (req.body['prizes.second'] !== undefined) prizes.second = Number(req.body['prizes.second']);
        if (req.body['prizes.third'] !== undefined) prizes.third = Number(req.body['prizes.third']);

        // Prepare update data, excluding sensitive or immutable fields
        const updateData = { ...req.body };
        delete updateData.futsalId; // Don't allow changing futsalId
        delete updateData.registeredTeams; // Don't allow manual update
        delete updateData.status; // Status is updated automatically
        delete updateData.bracket; // Bracket updated via separate endpoint
        delete updateData.stats; // Stats updated via separate endpoint

        // Remove flattened prize fields if they exist from spread
            delete updateData['prizes.first'];
            delete updateData['prizes.second'];
            delete updateData['prizes.third'];

        // If prizes were provided in the nested format, use them
        if (Object.keys(prizes).length > 0) {
            updateData.prizes = { ...tournament.prizes, ...prizes }; // Merge with existing prizes
        } else if (req.body.prizes) {
             // Handle case where prizes might be sent as a JSON object string
             try {
                 let parsedPrizes = typeof req.body.prizes === 'string' ? JSON.parse(req.body.prizes) : req.body.prizes;
                 updateData.prizes = {
                     first: Number(parsedPrizes.first || tournament.prizes.first),
                     second: Number(parsedPrizes.second || tournament.prizes.second),
                     third: Number(parsedPrizes.third || tournament.prizes.third)
                 };
             } catch(e) {
                 console.warn('Could not parse prizes object string:', e.message);
                 // Keep existing prizes if parsing fails
             }
        }

        // Handle numeric fields, ensuring they are numbers
        ['minTeams', 'maxTeams', 'teamSize', 'substitutes', 'registrationFee', 'halfDuration', 'breakDuration'].forEach(field => {
            if (updateData[field] !== undefined) {
                updateData[field] = Number(updateData[field]);
            }
        });


        // Handle file upload
        if (req.file) {
            let newBannerUrl = null;
            try {
                // Upload new banner first
                const blobPathPrefix = `tournament-banners/${tournament.futsalId}/`;
                newBannerUrl = await uploadToBlob('uploads', req.file.buffer, req.file.originalname, blobPathPrefix);
                console.log(`New banner uploaded: ${newBannerUrl}`);
                
                // If upload succeeds, delete the old banner from Blob Storage
                if (tournament.banner) {
                    console.log(`Deleting old banner from Blob Storage: ${tournament.banner}`);
                    await deleteBlob('uploads', tournament.banner);
                }
                
                // Set the new banner URL in the update data
                updateData.banner = newBannerUrl;

            } catch (uploadOrDeleteError) {
                console.error('Error during banner update (upload/delete):', uploadOrDeleteError);
                // If upload failed, don't delete old one. Decide if update should fail.
                // If delete failed after successful upload, maybe just log it.
                return res.status(500).json({
                    message: 'Failed to update tournament banner',
                    error: uploadOrDeleteError.message
                });
            }
        }
        // If no new file is uploaded (req.file is null), updateData.banner will not be set,
        // so the existing tournament.banner will remain unchanged by Object.assign.

        // Update the tournament fields
        Object.assign(tournament, updateData);

        // Recalculate prize pool (done by pre-save hook)
        await tournament.save();

            console.log('Tournament updated successfully:', tournament);
            res.json(tournament);
        } catch (error) {
            console.error('Error updating tournament:', error);
            if (error.name === 'ValidationError') {
                return res.status(400).json({ message: 'Validation Failed', errors: error.errors });
            }
            res.status(400).json({ message: `Error updating tournament: ${error.message}` });
        }
};
tournamentController.updateTournament = updateTournament;

const deleteTournament = async (req, res) => {
        try {
            // Step 1: Find the tournament first without deleting it
        const tournament = await Tournament.findOne({
                _id: req.params.id,
                futsalId: req.user.futsal
            });

        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found or not authorized.' });
        }

        // Step 2: Check for active registrations (Allow deletion for Cancelled status regardless)
        if (tournament.status !== 'Cancelled (Low Teams)') {
            const activeRegistrations = await TournamentRegistration.countDocuments({
                tournament: req.params.id,
                status: 'active' 
            });
    
            if (activeRegistrations > 0) {
                return res.status(400).json({
                    message: `Cannot delete tournament with ${activeRegistrations} active registration(s). Cancel registrations first.`
                });
            }
        } // Skip active registration check if status is Cancelled

        // Optional: Add checks for tournament status (Allow deletion for Completed)
        if (['Ongoing'].includes(tournament.status)) { // Only block deletion if Ongoing
             return res.status(400).json({
                 message: `Cannot delete a tournament that is ${tournament.status}.`
             });
        }

        // Step 3: Delete the tournament itself
        await Tournament.findByIdAndDelete(req.params.id);

        // Step 4: Delete the associated banner image from Blob Storage if it exists
        if (tournament.banner) { // Check if a banner URL exists
            console.log(`Attempting to delete blob for tournament banner: ${tournament.banner}`);
            try {
                 // Ensure deleteBlob is imported at the top
                await deleteBlob('uploads', tournament.banner); 
                console.log(`Deleted tournament banner blob: ${tournament.banner}`);
            } catch (blobDeleteError) {
                // Log error but continue with tournament deletion
                console.error(`Error deleting banner blob ${tournament.banner} for tournament ${req.params.id}:`, blobDeleteError);
            }
        } else {
             console.log(`No banner URL found for tournament ${req.params.id}, skipping blob deletion.`);
        }

        // Optional Step 5: Clean up related data (registrations)
        // NOTE: We decided to allow deletion even with registrations for Cancelled/Completed
        // If you wanted to delete associated registrations upon tournament delete:
        // const deleteResult = await TournamentRegistration.deleteMany({ tournament: req.params.id });
        // console.log(`Deleted ${deleteResult.deletedCount} associated registrations.`);

        console.log(`Tournament ${req.params.id} deleted successfully by admin ${req.user._id}`);

        res.json({ message: 'Tournament deleted successfully' });

    } catch (error) {
        console.error(`Error deleting tournament ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error deleting tournament' });
    }
};
tournamentController.deleteTournament = deleteTournament;

const getTournamentRegistrations = async (req, res) => {
    const tournamentId = req.params.id;
    console.log(`[LOG] Entering getTournamentRegistrations for Tournament ID: ${tournamentId}`); // Log entry
    try {
        // Basic check if the tournament belongs to the admin's futsal
        // Note: This check might be too strict if other roles need access later
        console.log(`[LOG] Checking ownership: Tournament=${tournamentId}, Admin Futsal=${req.user.futsal}`);
        const tournament = await Tournament.findOne({ _id: tournamentId, futsalId: req.user.futsal }, '_id name'); // Fetch name for logging
        if (!tournament) {
            console.log(`[LOG] Tournament ${tournamentId} not found or not associated with admin futsal ${req.user.futsal}.`);
            return res.status(404).json({ message: 'Tournament not found or not associated with this futsal.' });
        }
        console.log(`[LOG] Ownership check passed for tournament: ${tournament.name}`);

        // THE ACTUAL QUERY for registrations
        const query = { 
            tournament: tournamentId,
            status: 'active' // <<< RESTORED status filter
        }; 
        console.log(`[LOG] Querying TournamentRegistration collection with:`, query);
        
        // Find registrations matching the query
        const registrations = await TournamentRegistration.find(query)
            .populate('user', 'name email profilePicture username') // <<< Added username
            .populate('teamId', 'name') 
            .sort({ createdAt: -1 }); 

        console.log(`[LOG] Found ${registrations.length} registrations in DB matching query.`);
        // Log details of found registrations (optional, can be verbose)
        // registrations.forEach((reg, i) => console.log(`[LOG] Reg ${i}: ID=${reg._id}, Status=${reg.status}, Team=${reg.teamName}`)); 

            res.json(registrations);
        } catch (error) {
        console.error(`[LOG][ERROR] Error fetching registrations for tournament ${tournamentId}:`, error);
            res.status(500).json({ message: `Error fetching registrations: ${error.message}` });
        }
};
tournamentController.getTournamentRegistrations = getTournamentRegistrations;

const updateTournamentBracket = async (req, res) => {
    const tournamentId = req.params.id;
    const adminFutsalId = req.user.futsal;
    try {
        console.log(`[UPDATE BRACKET] Request received for tournament: ${tournamentId} by admin: ${req.user._id}`);
        // --- ADD LOGGING HERE ---
        console.log('[UPDATE BRACKET] Received Body:', JSON.stringify(req.body, null, 2));
        // Log the received payload
        // --- END LOGGING ---

        // Basic validation
        if (!req.body.bracket) {
            console.log('[UPDATE BRACKET] Validation failed: Missing bracket data.');
            return res.status(400).json({ message: 'Bracket data is required in the request body.' });
        }

            // Only update bracket and stats fields
            const bracketUpdateData = {
                bracket: req.body.bracket,
            stats: req.body.stats // Include stats if provided
            };

        // Add generated flag if not present and bracket data exists
            if (bracketUpdateData.bracket && !bracketUpdateData.bracket.generated) {
                bracketUpdateData.bracket.generated = true;
            }

        // --- ADD LOGGING HERE ---
        console.log('[UPDATE BRACKET] Prepared Update Data:', JSON.stringify(bracketUpdateData, null, 2));
        // Log the data that will be set in the database
        // --- END LOGGING ---

        // Find and update the tournament, ensuring it belongs to the admin's futsal
            const tournament = await Tournament.findOneAndUpdate(
            { _id: tournamentId, futsalId: adminFutsalId }, // Match ID and admin's futsal
            { $set: bracketUpdateData }, // Use $set to update specific fields
            { new: true, runValidators: true } // Return updated doc, run schema validators
            );

            if (!tournament) {
            console.log(`[UPDATE BRACKET] Update bracket failed: Tournament ${tournamentId} not found or doesn't belong to futsal ${adminFutsalId}`);
            return res.status(404).json({ message: 'Tournament not found or not authorized' });
        }

        console.log('[UPDATE BRACKET] Tournament bracket updated successfully in DB for tournament:', tournament._id);

        // --- START: Update Stats Based on Bracket --- 
        let statsNeedUpdate = false;
        const finalRound = tournament.bracket?.rounds?.[tournament.bracket.rounds.length - 1];
        const finalMatch = finalRound?.matches?.find(m => !m.isThirdPlace); // Find the actual final match
        const thirdPlaceMatch = finalRound?.matches?.find(m => m.isThirdPlace);

        console.log(`[UPDATE STATS CHECK] Final Match Found: ${!!finalMatch}, 3rd Place Match Found: ${!!thirdPlaceMatch}`);

        // Update 1st and 2nd Place
        if (finalMatch?.completed && finalMatch?.winner) {
            console.log(`[UPDATE STATS CHECK] Final match winner ID: ${finalMatch.winner.id}`);
            if (tournament.stats?.firstPlace?.id !== finalMatch.winner.id) {
                tournament.stats.firstPlace = finalMatch.winner; // Winner is 1st
                 // Loser is 2nd - determine loser
                const loser = finalMatch.team1?.id === finalMatch.winner.id ? finalMatch.team2 : finalMatch.team1;
                if (loser && loser.id !== 'BYE' && tournament.stats?.secondPlace?.id !== loser.id) {
                    tournament.stats.secondPlace = loser;
                    console.log(`[UPDATE STATS] Set 1st: ${tournament.stats.firstPlace?.name}, 2nd: ${tournament.stats.secondPlace?.name}`);
                    statsNeedUpdate = true;
                } else if (loser?.id === 'BYE') {
                     console.log(`[UPDATE STATS] Final match opponent was BYE. Setting 2nd place to null.`);
                     if (tournament.stats?.secondPlace !== null) {
                         tournament.stats.secondPlace = null;
                         statsNeedUpdate = true;
                     }
                } else {
                     console.log(`[UPDATE STATS] Could not determine 2nd place or it hasn't changed.`);
                }
            } else {
                console.log(`[UPDATE STATS CHECK] 1st place already matches final winner.`);
            }
        }

        // Update 3rd Place
        if (thirdPlaceMatch?.completed && thirdPlaceMatch?.winner) {
            console.log(`[UPDATE STATS CHECK] 3rd place match winner ID: ${thirdPlaceMatch.winner.id}`);
            if (tournament.stats?.thirdPlace?.id !== thirdPlaceMatch.winner.id) {
                tournament.stats.thirdPlace = thirdPlaceMatch.winner;
                console.log(`[UPDATE STATS] Set 3rd: ${tournament.stats.thirdPlace?.name}`);
                statsNeedUpdate = true;
            }
        } else if (thirdPlaceMatch && !thirdPlaceMatch.winner) {
             // If 3rd place match exists but has no winner yet, ensure stat is null
             if (tournament.stats?.thirdPlace !== null) {
                 console.log(`[UPDATE STATS] Resetting 3rd place stat to null as match winner is not set.`);
                 tournament.stats.thirdPlace = null;
                 statsNeedUpdate = true;
             }
        }

        // Save again ONLY if stats were updated
        if (statsNeedUpdate) {
            console.log('[UPDATE STATS] Saving tournament again due to stats updates...');
            await tournament.save(); // Use save() to trigger any potential pre-save hooks if needed
            console.log('[UPDATE STATS] Tournament stats saved successfully.');
        }
        // --- END: Update Stats Based on Bracket --- 

        res.json(tournament); // Send the potentially updated tournament doc back
        } catch (error) {
        console.error('[UPDATE BRACKET] Error updating tournament bracket:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation Failed', errors: error.errors });
        }
            res.status(500).json({ message: `Error updating tournament bracket: ${error.message}` });
    }
};
tournamentController.updateTournamentBracket = updateTournamentBracket;

const debugGenerateBracket = async (req, res) => {
    // IMPORTANT: This should ONLY run in non-production environments
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: 'This function is disabled in production.' });
    }

    try {
        const tournamentId = req.params.id;
        console.log(`[DEBUG BRACKET] Received request for tournament: ${tournamentId}`);
        
        if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
            return res.status(400).json({ message: 'Invalid Tournament ID format.' });
        }

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found.' });
        }
        
         if (tournament.bracket && tournament.bracket.generated) {
            console.log(`[DEBUG BRACKET] Bracket already generated for ${tournamentId}. Re-generating anyway.`);
            // Optionally allow re-generation or return a message
            // return res.status(400).json({ message: 'Bracket already generated for this tournament.' });
        }

        const allRegistrations = await TournamentRegistration.find({
            tournament: tournament._id,
            status: 'active' // Ensure we only use active registrations
        });

        // Use a reasonable minimum for generation in debug, or just proceed
        const minTeamsForDebug = Math.max(2, tournament.minTeams || 2); // At least 2 teams needed

        if (allRegistrations.length < minTeamsForDebug) {
             console.warn(`[DEBUG BRACKET] Not enough active registrations (${allRegistrations.length}) found for tournament ${tournamentId}. Minimum needed for debug generation: ${minTeamsForDebug}. Generating anyway if possible, but might be empty.`);
             // Decide if you want to stop or proceed with potentially empty bracket
             // If you want to stop:
             // return res.status(400).json({ message: `Need at least ${minTeamsForDebug} active registrations to generate bracket (found ${allRegistrations.length}). Register more teams.` });
        }

        console.log(`[DEBUG BRACKET] Generating bracket for ${tournamentId} with ${allRegistrations.length} active registrations.`);
        
        const generatedBracket = generateSingleEliminationBracket(allRegistrations, tournament.maxTeams);

        if (generatedBracket) {
            tournament.bracket = generatedBracket;
             // Ensure the generated flag is set
            if (!tournament.bracket.generated) {
                tournament.bracket.generated = true;
            }
            await tournament.save();
            console.log(`[DEBUG BRACKET] Successfully generated and saved bracket for tournament ${tournament._id}`);
            res.status(200).json({ message: 'Bracket generated successfully via debug.', bracket: tournament.bracket });
        } else {
            console.error(`[DEBUG BRACKET] Failed to generate bracket structure for tournament ${tournament._id}`);
            res.status(500).json({ message: 'Failed to generate bracket structure.' });
        }
    } catch (error) {
        console.error(`[DEBUG BRACKET] Error generating bracket: ${error.message}`);
        res.status(500).json({ message: `Error generating bracket via debug: ${error.message}` });
    }
};
tournamentController.debugGenerateBracket = debugGenerateBracket;

// --- Export Controller Object ---

module.exports = tournamentController;