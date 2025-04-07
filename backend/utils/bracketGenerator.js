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

/**
 * Generates a single-elimination bracket structure.
 * @param {Array<Object>} teams - Array of team objects (needs _id and teamName).
 * @param {number} numSpots - The total number of spots in the bracket (power of 2, e.g., 8, 16, 32).
 * @returns {Object} The generated bracket structure or null if inputs are invalid.
 */
function generateSingleEliminationBracket(teams, numSpots) {
    if (!teams || !Array.isArray(teams) || ![8, 16, 32].includes(numSpots)) {
        console.error('[Bracket Generator] Invalid input for bracket generation.');
        return null;
    }

    const numTeams = teams.length;
    if (numTeams < 2) {
        console.error('[Bracket Generator] Not enough teams to generate a bracket.');
        return null; // Need at least 2 teams
    }
    if (numTeams > numSpots) {
        console.error('[Bracket Generator] More teams than available spots.');
        return null; // Should not happen with proper checks
    }

    const numRounds = Math.log2(numSpots);
    const numByes = numSpots - numTeams;

    // Shuffle teams randomly
    const shuffledTeams = shuffle([...teams]);

    const bracket = {
        rounds: [],
        generated: true,
        numSpots: numSpots
    };

    // Create the first round
    const round1 = [];
    let teamIndex = 0;
    let byeIndex = 0;
    const numRound1Matches = numSpots / 2;

    // Distribute teams and BYEs into initial matchups
    // A simple approach is to fill teams first, then BYEs
    const matchParticipants = [];
    for (let i = 0; i < numTeams; i++) {
        matchParticipants.push({
            _id: shuffledTeams[i]._id, // Registration ID
            teamId: shuffledTeams[i].teamId,
            name: shuffledTeams[i].teamName
        });
    }
    for (let i = 0; i < numByes; i++) {
        matchParticipants.push({ _id: 'BYE', teamId: 'BYE', name: 'BYE' });
    }

    // Pair participants for round 1
    for (let i = 0; i < numRound1Matches; i++) {
        const team1 = matchParticipants[i * 2];
        const team2 = matchParticipants[i * 2 + 1];
        const match = {
            match: i + 1, // Match number in this round
            round: 1,
            team1: team1,
            team2: team2,
            winner: null,
            score: null // Placeholder for score if needed later
        };

        // If one team gets a BYE, they automatically win the match
        if (team1._id === 'BYE') {
            match.winner = team2._id;
        } else if (team2._id === 'BYE') {
            match.winner = team1._id;
        }
        round1.push(match);
    }
    bracket.rounds.push(round1);

    // Create structure for subsequent rounds (placeholders)
    let matchesInPreviousRound = numRound1Matches;
    for (let r = 2; r <= numRounds; r++) {
        const currentRound = [];
        const matchesInCurrentRound = matchesInPreviousRound / 2;
        for (let m = 0; m < matchesInCurrentRound; m++) {
            const matchNum = (bracket.rounds.flat().length) + m + 1; // Global match number
            currentRound.push({
                match: matchNum,
                round: r,
                team1: { _id: null, name: `Winner M${(m * 2) + (matchesInPreviousRound*2 - numSpots/Math.pow(2, r-2)) + 1}` }, // Placeholder referencing previous match winner
                team2: { _id: null, name: `Winner M${(m * 2 + 1) + (matchesInPreviousRound*2 - numSpots/Math.pow(2, r-2)) + 1}` }, // Placeholder referencing previous match winner
                winner: null,
                score: null
            });
        }
        bracket.rounds.push(currentRound);
        matchesInPreviousRound = matchesInCurrentRound;
    }


    return bracket;
}

module.exports = { generateSingleEliminationBracket }; 