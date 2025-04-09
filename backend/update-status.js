// update-status.js - script to test and run tournament status updates
require('dotenv').config();
const mongoose = require('mongoose');
const { updateTournamentStatuses, updateSingleTournamentStatus } = require('./utils/tournamentStatus');
const Tournament = require('./models/tournament.model');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB.');
    
    try {
      // Let's find all tournaments with "Test" in the name, regardless of status
      const testTournaments = await Tournament.find({
        name: /Test Tournament/i // Looking specifically for "Test Tournament"
      });
      
      if (testTournaments.length > 0) {
        console.log(`\n===== FOUND ${testTournaments.length} "Test Tournament" TOURNAMENTS =====`);
        
        // Fix each of them
        for (const tournament of testTournaments) {
          console.log(`\n==== CHECKING TOURNAMENT: ${tournament.name} (${tournament._id}) ====`);
          console.log(`Current status: ${tournament.status}`);
          console.log(`Registration deadline: ${tournament.registrationDeadline}`);
          console.log(`Start date: ${tournament.startDate}`);
          console.log(`End date: ${tournament.endDate}`);
          
          // All test tournaments should be "Upcoming" if their end date is in the future
          // This is a forced override for the specific case mentioned
          if (tournament.endDate > new Date() && tournament.status !== 'Upcoming') {
            console.log(`\n*** FIXING: "${tournament.name}" has future end date but status is "${tournament.status}" ***`);
            
            // Force set to Upcoming
            const oldStatus = tournament.status;
            tournament.status = 'Upcoming';
            await tournament.save();
            
            console.log(`*** FIXED: Status changed from "${oldStatus}" to "Upcoming" ***`);
          } else {
            console.log(`No fix needed for this tournament.`);
          }
        }
      } else {
        console.log('No "Test Tournament" found in the database.');
        
        // Let's find any tournaments with "test" in the name with any casing
        const anyTestTournaments = await Tournament.find({
          name: { $regex: 'test', $options: 'i' }
        });
        
        if (anyTestTournaments.length > 0) {
          console.log(`\nFound ${anyTestTournaments.length} tournaments with "test" in the name:`);
          for (const t of anyTestTournaments) {
            console.log(`- ${t.name} (${t._id})`);
            console.log(`  Status: ${t.status}`);
            console.log(`  End date: ${t.endDate}`);
            
            // Fix any that have future end dates but are marked completed
            if (t.endDate > new Date() && t.status === 'Completed') {
              t.status = 'Upcoming';
              await t.save();
              console.log(`  FIXED: Changed status from "Completed" to "Upcoming"`);
            }
          }
        }
        
        // Let's also try fixing by date range - find tournaments created today with future end dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const recentTournaments = await Tournament.find({
          createdAt: { $gte: today },
          endDate: { $gt: new Date() },
          status: 'Completed'
        });
        
        if (recentTournaments.length > 0) {
          console.log(`\nFound ${recentTournaments.length} tournaments created today with future end dates but marked as Completed:`);
          for (const t of recentTournaments) {
            console.log(`- ${t.name} (${t._id})`);
            
            // Force set to Upcoming
            t.status = 'Upcoming';
            await t.save();
            console.log(`  FIXED: Changed status from "Completed" to "Upcoming"`);
          }
        }
      }
      
      // Run the general status update function as well
      console.log('\nRunning general status update...');
      const result = await updateTournamentStatuses();
      console.log('Status update complete:', result);
      
    } catch (error) {
      console.error('Error running status update:', error);
    } finally {
      // Close the connection when done
      await mongoose.connection.close();
      console.log('Database connection closed.');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }); 