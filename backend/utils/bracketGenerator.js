// backend/utils/bracketGenerator.js

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Define BYE_TEAM constant for backend use
const BYE_TEAM = { _id: 'BYE', teamId: 'BYE', name: 'Bye' };

/**
 * Generates a single-elimination bracket structure with standard bye placement.
 * @param {Array<Object>} registrations - Array of registration objects (needs _id, teamId, teamName).
 * @param {number} numSpots - The total number of spots in the bracket (power of 2, e.g., 8, 16, 32).
 * @returns {Object} The generated bracket structure or null if inputs are invalid.
 */
function generateSingleEliminationBracket(registrations, numSpots) {
    console.log('[Bracket Generator - v3] Starting generation...');
    if (!registrations || !Array.isArray(registrations) || ![8, 16, 32].includes(numSpots)) {
        console.error('[Bracket Generator - v3] Invalid input: Registrations must be an array and numSpots must be 8, 16, or 32.');
        return null;
    }

    const numTeams = registrations.length;
    if (numTeams < 2) {
        console.error('[Bracket Generator - v3] Not enough teams (< 2) to generate a bracket.');
        return null;
    }
    if (numTeams > numSpots) {
        console.error(`[Bracket Generator - v3] More teams (${numTeams}) than available spots (${numSpots}).`);
        return null;
    }

    // Shuffle registrations randomly before assigning slots
    const shuffledRegistrations = shuffle([...registrations]);
    console.log('[Bracket Generator - v3] Shuffled Team Names:', JSON.stringify(shuffledRegistrations.map(r => r.teamName)));

    const numRounds = Math.log2(numSpots);
    const numByes = numSpots - numTeams;
    const numRound1Matches = numSpots / 2;

    console.log(`[Bracket Generator - v3] Creating bracket: Teams=${numTeams}, Byes=${numByes}, Rounds=${numRounds}, Spots=${numSpots}`);

    const bracket = {
        rounds: [],
        generated: true,
        numSpots: numSpots
    };

    // --- Standard Seeding and Bye Placement ---
    const participants = [];
    let teamIdx = 0;

    // Assign teams to the top slots
    for (let i = 0; i < numTeams; i++) {
        participants[i] = {
            _id: shuffledRegistrations[teamIdx]._id, // Use registration _id as the unique identifier for the match participant
            teamId: shuffledRegistrations[teamIdx].teamId, // Keep original teamId if needed
            name: shuffledRegistrations[teamIdx].teamName
        };
        teamIdx++;
    }
    // Fill remaining slots with null (representing Byes for pairing)
    for (let i = numTeams; i < numSpots; i++) {
        participants[i] = null; // Placeholder for Bye
    }
    console.log('[Bracket Generator - v3] Participants array created with proper seeding');

    // --- Create Round 1 Matches ---
    const round1 = [];
    console.log('\n[Bracket Generator - v3] Creating Round 1 Matches...');
    for (let i = 0; i < numRound1Matches; i++) {
        const matchId = `R1-M${i + 1}`; // Use simple ID for now
        const participant1 = participants[i];
        const participant2 = participants[numSpots - 1 - i]; // Pair top with bottom

        const isParticipant1Bye = participant1 === null;
        const isParticipant2Bye = participant2 === null;
        const hasBye = isParticipant1Bye || isParticipant2Bye;

        let team1, team2, winner = null, completed = false;

        if (isParticipant1Bye && isParticipant2Bye) {
            // This case should theoretically not happen with this logic
            console.error(`[Bracket Generator - v3] ERROR! Attempted to create Bye vs Bye for match ${i + 1}. Skipping.`);
            continue; // Skip creating this invalid match
        } else if (hasBye) {
            if (isParticipant2Bye) { // Participant 1 gets the bye
                team1 = participant1;
                team2 = BYE_TEAM;
                winner = team1._id; // Winner is the actual team's registration _id
                completed = true;
                console.log(`[Bracket Generator - v3] Match ${i + 1} is a BYE for ${team1.name}`);
            } else { // Participant 2 gets the bye (isParticipant1Bye is true)
                team1 = BYE_TEAM;
                team2 = participant2;
                winner = team2._id; // Winner is the actual team's registration _id
                completed = true;
                console.log(`[Bracket Generator - v3] Match ${i + 1} is a BYE for ${team2.name}`);
            }
        } else { // Regular match
            team1 = participant1;
            team2 = participant2;
            console.log(`[Bracket Generator - v3] Match ${i + 1}: ${team1.name} vs ${team2.name}`);
        }

        const matchData = {
            match: i + 1, // Match number in this round
            round: 1,
            team1: team1, // Contains { _id, teamId, name } or BYE_TEAM
            team2: team2, // Contains { _id, teamId, name } or BYE_TEAM
            winner: winner, // Stores the registration _id of the winner, or null
            score1: null, // Scores start null
            score2: null,
            pk1: null,
            pk2: null,
            hasPK: false,
            completed: completed,
            hasBye: hasBye,
            // Add placeholders for frontend fields if needed
            date: '',
            time: '',
            topScorer: { name: '', goals: 0 },
            isThirdPlace: false
        };
        round1.push(matchData);
    }
    bracket.rounds.push(round1);
    console.log('[Bracket Generator - v3] Round 1 matches created successfully');

    // --- Create Structure for Subsequent Rounds ---
    console.log('\n[Bracket Generator - v3] Creating subsequent round structures...');
    let matchesInPreviousRound = numRound1Matches;
    let totalMatchesSoFar = numRound1Matches; // Keep track of global match number

    for (let r = 2; r <= numRounds; r++) {
        const currentRoundMatches = [];
        const matchesInCurrentRound = matchesInPreviousRound / 2;
        console.log(`[Bracket Generator - v3] Creating Round ${r} with ${matchesInCurrentRound} matches`);
        
        for (let m = 0; m < matchesInCurrentRound; m++) {
            const matchNum = totalMatchesSoFar + m + 1; // Calculate global match number
            currentRoundMatches.push({
                match: matchNum,
                round: r,
                team1: null, // Placeholder
                team2: null, // Placeholder
                winner: null,
                score1: null, score2: null, pk1: null, pk2: null, hasPK: false,
                completed: false, hasBye: false,
                date: '', time: '', topScorer: { name: '', goals: 0 }, isThirdPlace: false
            });
        }
        bracket.rounds.push(currentRoundMatches);
        matchesInPreviousRound = matchesInCurrentRound;
        totalMatchesSoFar += matchesInCurrentRound;
    }
    
    // --- Add 3rd Place Match as a Separate Fixture ---
    console.log('\n[Bracket Generator - v3] Setting up 3rd place match fixture...');
    if (numRounds >= 2 && numTeams > 2) {
        // Get the final round index
        const finalRoundIndex = bracket.rounds.length - 1;
        
        // Create a dedicated 3rd place match in the same round as the final
        const thirdPlaceMatchData = {
            match: totalMatchesSoFar + 1, // Next available match number
            round: numRounds, // Same round number as the final
            team1: null, // Will be filled with semifinal loser 1
            team2: null, // Will be filled with semifinal loser 2
            winner: null,
            score1: null, score2: null, pk1: null, pk2: null, hasPK: false,
            completed: false, hasBye: false,
            date: '', time: '', topScorer: { name: '', goals: 0 },
            isThirdPlace: true, // Mark as 3rd place match
            matchName: '3rd Place Match' // Special name for display
        };
        
        // Add the match to the final round's array
        bracket.rounds[finalRoundIndex].push(thirdPlaceMatchData);
        console.log('[Bracket Generator - v3] 3rd place match created with match number', thirdPlaceMatchData.match);
        console.log('[Bracket Generator - v3] 3rd place match will appear in UI below the championship final');
    } else {
        console.log('[Bracket Generator - v3] Not enough rounds or teams for a 3rd place match');
    }

    // --- Propagate Bye Winners ---
    console.log('\n[Bracket Generator - v3] Propagating bye winners through the bracket...');
    propagateByeWinners(bracket, registrations);
    
    console.log('[Bracket Generator - v3] Bracket generation complete');
    return bracket;
}

/**
 * Propagates winners from completed matches (especially byes) to subsequent rounds.
 * Also handles semifinal losers to the 3rd place match.
 * @param {Object} bracket - The bracket structure.
 * @param {Array<Object>} registrations - The original list of registrations to look up team details.
 */
function propagateByeWinners(bracket, registrations) {
    console.log("[PropagateWinners] Starting winner and loser propagation...");
    if (!bracket || !bracket.rounds || bracket.rounds.length < 2) {
        console.log("[PropagateWinners] Not enough rounds to process");
        return;
    }

    const rounds = bracket.rounds;
    
    // Find the 3rd place match for later use
    const finalRoundIndex = rounds.length - 1;
    const thirdPlaceMatch = rounds[finalRoundIndex]?.find(match => match.isThirdPlace);
    
    if (thirdPlaceMatch) {
        console.log("[PropagateWinners] Found 3rd place match setup:", thirdPlaceMatch.match);
    } else {
        console.log("[PropagateWinners] No 3rd place match exists in this bracket");
    }

    // Process each round to propagate winners forward
    for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex++) {
        const currentRound = rounds[roundIndex];
        const nextRound = rounds[roundIndex + 1];
        const isSemifinalRound = roundIndex === rounds.length - 2; // Check if this is the semifinal round
        
        console.log(`[PropagateWinners] Processing Round ${roundIndex + 1} -> Round ${roundIndex + 2}`);

        // Filter out 3rd place match from the next round for regular winner propagation
        const nextRegularMatches = nextRound.filter(m => !m.isThirdPlace);

        // Process all matches in current round
        for (let matchIndex = 0; matchIndex < currentRound.length; matchIndex++) {
            const match = currentRound[matchIndex];

            // Skip propagation from 3rd place match
            if (match.isThirdPlace) continue;

            // If match has a winner, propagate to next round
            if (match.winner) {
                console.log(`[PropagateWinners] Match ${match.match} (R${match.round}) has winner ID: ${match.winner}`);

                // Find the actual winning team object using winner ID
                const winningRegistration = registrations.find(reg => reg._id.toString() === match.winner.toString());
                if (!winningRegistration) {
                    console.log(`[PropagateWinners] No registration found for winner ID ${match.winner}, skipping`);
                    continue;
                }

                const winningTeamDetails = {
                    _id: winningRegistration._id,
                    teamId: winningRegistration.teamId,
                    name: winningRegistration.teamName
                };

                // Propagate winner to next round
                const nextMatchIndex = Math.floor(matchIndex / 2);
                if (nextMatchIndex < nextRegularMatches.length) {
                    const nextMatch = nextRegularMatches[nextMatchIndex];
                    const isFirstTeamSlot = matchIndex % 2 === 0;

                    console.log(`[PropagateWinners] Propagating ${winningTeamDetails.name} to Match ${nextMatch.match} as team${isFirstTeamSlot ? '1' : '2'}`);

                    if (isFirstTeamSlot) {
                        nextMatch.team1 = winningTeamDetails;
                    } else {
                        nextMatch.team2 = winningTeamDetails;
                    }
                } 
                
                // Additionally, handle semifinal losers for 3rd place match
                if (isSemifinalRound && thirdPlaceMatch) {
                    propagateSemifinalLoserTo3rdPlace(match, matchIndex, winningRegistration, registrations, thirdPlaceMatch);
                }
            } else {
                console.log(`[PropagateWinners] Match ${match.match} (R${match.round}) has no winner yet`);
            }
        }
    }
    
    console.log("[PropagateWinners] Winner and loser propagation complete");
}

/**
 * Propagates semifinal losers to the 3rd place match
 * @param {Object} semifinalMatch - The semifinal match
 * @param {number} matchIndex - The index of the semifinal match
 * @param {Object} winningTeam - The winning team registration
 * @param {Array} registrations - All team registrations
 * @param {Object} thirdPlaceMatch - The 3rd place match
 */
function propagateSemifinalLoserTo3rdPlace(semifinalMatch, matchIndex, winningTeam, registrations, thirdPlaceMatch) {
    console.log("[3rdPlaceMatch] Processing semifinal match for 3rd place qualification...");
    
    // Determine which semifinal this is (first or second)
    const isFirstSemifinal = matchIndex % 2 === 0;
    
    // Find the losing team (the team that's not the winner)
    let losingTeam = null;
    
    // Identify the loser based on which team is the winner
    if (semifinalMatch.team1 && semifinalMatch.team1._id && 
        semifinalMatch.team1._id.toString() === winningTeam._id.toString()) {
        // Winner is team1, so loser is team2
        if (semifinalMatch.team2 && semifinalMatch.team2._id !== 'BYE') {
            const losingReg = registrations.find(reg => 
                reg._id.toString() === semifinalMatch.team2._id.toString());
            if (losingReg) {
                losingTeam = {
                    _id: losingReg._id,
                    teamId: losingReg.teamId,
                    name: losingReg.teamName
                };
            }
        }
    } else if (semifinalMatch.team2 && semifinalMatch.team2._id && 
               semifinalMatch.team2._id.toString() === winningTeam._id.toString()) {
        // Winner is team2, so loser is team1
        if (semifinalMatch.team1 && semifinalMatch.team1._id !== 'BYE') {
            const losingReg = registrations.find(reg => 
                reg._id.toString() === semifinalMatch.team1._id.toString());
            if (losingReg) {
                losingTeam = {
                    _id: losingReg._id,
                    teamId: losingReg.teamId,
                    name: losingReg.teamName
                };
            }
        }
    }
    
    // If we found a loser and it's not a BYE, assign to 3rd place match
    if (losingTeam) {
        console.log(`[3rdPlaceMatch] Semifinal loser identified: ${losingTeam.name}`);
        
        if (isFirstSemifinal) {
            console.log(`[3rdPlaceMatch] Assigning ${losingTeam.name} as team1 in 3rd place match`);
            thirdPlaceMatch.team1 = losingTeam;
        } else {
            console.log(`[3rdPlaceMatch] Assigning ${losingTeam.name} as team2 in 3rd place match`);
            thirdPlaceMatch.team2 = losingTeam;
        }
        
        console.log(`[3rdPlaceMatch] 3rd place match updated: Team1=${thirdPlaceMatch.team1?.name || 'TBD'}, Team2=${thirdPlaceMatch.team2?.name || 'TBD'}`);
    } else {
        console.log("[3rdPlaceMatch] Could not determine semifinal loser (possible BYE or incomplete match)");
    }
}

module.exports = { generateSingleEliminationBracket };