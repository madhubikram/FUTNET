// backend/update-status.js - Modified for Specific Tournament Testing
require('dotenv').config();
const mongoose = require('mongoose');
// Keep both imports just in case, though single update isn't called now
const { updateTournamentStatuses, updateSingleTournamentStatus } = require('./utils/tournamentStatus'); 
const Tournament = require('./models/tournament.model');

// --- Configuration for Test ---
const TARGET_TOURNAMENT_ID = '67fa2d4becbfeacb07bb5e2d'; 
const TEST_SCENARIO = 'end'; // Should be 'end' for this test
const SIMULATE_ENOUGH_TEAMS = true; 
// --- End Configuration ---

if (!TARGET_TOURNAMENT_ID || TARGET_TOURNAMENT_ID === 'YOUR_TEST_TOURNAMENT_ID') {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! ERROR: Please paste your actual test tournament ID   !!!");
    console.error("!!! into the TARGET_TOURNAMENT_ID variable in this script. !!!");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB for testing status update.');

    try {
      let testTournament = await Tournament.findById(TARGET_TOURNAMENT_ID); 

      if (!testTournament) { 
          console.log(`Test tournament with ID ${TARGET_TOURNAMENT_ID} not found.`);
          return; 
      }

      console.log(`\n--- Testing Scenario: '${TEST_SCENARIO.toUpperCase()}' for Tournament: ${testTournament.name} (${testTournament._id}) ---`);
      console.log(`Original Status: ${testTournament.status}`);
      console.log(`Original registeredTeams: ${testTournament.registeredTeams}, minTeams required: ${testTournament.minTeams}`);

      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); 

      // --- Force Conditions Based on Scenario ---
      if (TEST_SCENARIO === 'start') {
          // Use UTC methods to get the correct HH:MM strings for UTC time
          const startUTC_HH = String(fiveMinutesAgo.getUTCHours()).padStart(2, '0');
          const startUTC_MM = String(fiveMinutesAgo.getUTCMinutes()).padStart(2, '0');
          const endUTC_HH = String(oneHourFromNow.getUTCHours()).padStart(2, '0');
          const endUTC_MM = String(oneHourFromNow.getUTCMinutes()).padStart(2, '0');
          testTournament.startDate = fiveMinutesAgo; 
          testTournament.startTime = `${startUTC_HH}:${startUTC_MM}`;
          testTournament.endDate = oneHourFromNow;
          testTournament.endTime = `${endUTC_HH}:${endUTC_MM}`;
          testTournament.status = 'Upcoming'; 
          console.log(`  Set startDate to past: ${testTournament.startDate.toISOString()}, startTime(UTC) to: ${testTournament.startTime}`);
          console.log(`  Set endDate to future: ${testTournament.endDate.toISOString()}, endTime(UTC) to: ${testTournament.endTime}`);
          console.log(`  Set status to: ${testTournament.status}`);

      } else if (TEST_SCENARIO === 'end') {
          // Use UTC methods to get the correct HH:MM strings for UTC time
          const startUTC_HH = String(tenMinutesAgo.getUTCHours()).padStart(2, '0');
          const startUTC_MM = String(tenMinutesAgo.getUTCMinutes()).padStart(2, '0');
          const endUTC_HH = String(fiveMinutesAgo.getUTCHours()).padStart(2, '0');
          const endUTC_MM = String(fiveMinutesAgo.getUTCMinutes()).padStart(2, '0');
          testTournament.startDate = tenMinutesAgo;
          testTournament.startTime = `${startUTC_HH}:${startUTC_MM}`; 
          testTournament.endDate = fiveMinutesAgo;
          testTournament.endTime = `${endUTC_HH}:${endUTC_MM}`; 
          testTournament.status = 'Ongoing'; 
          console.log(`  Set endDate to past: ${testTournament.endDate.toISOString()}, endTime(UTC) to: ${testTournament.endTime}`); 
          console.log(`  Set status to: ${testTournament.status}`);
      } else { 
          console.error("Invalid TEST_SCENARIO. Use 'start' or 'end'.");
          return; 
      }

      if (SIMULATE_ENOUGH_TEAMS && testTournament.registeredTeams < testTournament.minTeams) { 
          testTournament.registeredTeams = testTournament.minTeams; 
          console.log(`  SIMULATED registeredTeams to: ${testTournament.registeredTeams} (to bypass cancellation check)`);
       }

      await testTournament.save();
      console.log(`Test tournament saved with forced conditions.`);

      // --- Now call the MAIN function which should detect the change AND trigger notifications ---
       console.log('\n>>> Calling updateTournamentStatuses() to check for changes and trigger notifications...');
       const mainUpdateResult = await updateTournamentStatuses();
       console.log('\n<<< updateTournamentStatuses() finished executing.');
       console.log('Main Update Result:', mainUpdateResult);
      // --- End Notification Trigger ---

    } catch (error) { 
        console.error('\n!!! Error during test script execution:', error);
    } 
    finally { 
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    }
  })
  .catch(err => { 
      console.error('MongoDB connection error:', err);
      process.exit(1);
   }); 