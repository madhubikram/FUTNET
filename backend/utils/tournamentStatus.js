// utils/tournamentStatus.js
const Tournament = require('../models/tournament.model');
const TournamentRegistration = require('../models/tournament.registration.model');
const User = require('../models/user.model');
const { createNotification } = require('./notification.service');
const moment = require('moment');

/**
 * Combines a date and time string into a full Date object
 * @param {Date} dateObj - Date object (without specific time)
 * @param {String} timeStr - Time string in format "HH:MM" 
 * @returns {Date} Combined date and time
 */
const combineDateAndTime = (dateObj, timeStr) => {
  if (!dateObj) {
    // console.error('[Date Utility] Invalid date object provided'); // Reduced noise
    return null;
  }
  
  // Use UTC components to create a base date at midnight UTC
  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth(); // 0-indexed
  const day = dateObj.getUTCDate();
  const result = new Date(Date.UTC(year, month, day, 0, 0, 0, 0)); // Explicitly UTC midnight
  
  // If time string is provided, set the UTC time component
  if (timeStr && typeof timeStr === 'string') {
    const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
    if (!isNaN(hours) && !isNaN(minutes)) {
      result.setUTCHours(hours, minutes, 0, 0); // Use setUTCHours
    } else {
      // console.warn(`[Date Utility] Invalid time format: "${timeStr}"`); // Log remains commented
    }
  }
  
  return result;
};

const updateTournamentStatuses = async () => {
    try {
      const now = new Date();
      // console.log(`[Status Update] Running tournament status update at ${now.toISOString()}`); // Less verbose
  
      const allTournaments = await Tournament.find({});
      // console.log(`[Status Update] Found ${allTournaments.length} tournaments to process`); // Less verbose
      
      let statusChanges = {
        registrationClosed: 0,
        upcomingToOngoing: 0,
        ongoingToCompleted: 0
      };
      
      const sendNotifications = async (tournament, playerType, adminType, playerTitle, playerMessageFn, adminTitle, adminMessageFn) => {
        // console.log(`[sendNotifications] Attempting for tournament ${tournament._id}, type ${playerType}/${adminType}`); // Less verbose
        try {
          const registrations = await TournamentRegistration.find({ tournament: tournament._id }).populate('user', 'name');
          const participants = registrations.map(reg => reg.user).filter(Boolean); 
          // console.log(`[sendNotifications] Found ${participants.length} participants for ${tournament._id}`); // Less verbose
          
          for (const participant of participants) {
             // console.log(`[sendNotifications] Sending ${playerType} to participant ${participant._id}`); // Less verbose
            await createNotification(
              participant._id,
              playerTitle,
              playerMessageFn(tournament, participant),
              playerType,
              `/tournaments/${tournament._id}` // Link to tournament details
            );
          }

          if (tournament.futsalId) {
            const admin = await User.findOne({ futsal: tournament.futsalId, role: 'futsalAdmin' });
            if (admin) {
              // console.log(`[sendNotifications] Sending ${adminType} to admin ${admin._id}`); // Less verbose
              await createNotification(
                admin._id,
                adminTitle,
                adminMessageFn(tournament, participants.length),
                adminType,
                `/admin/tournaments/${tournament._id}` // Link to admin tournament details
              );
            } else {
                console.warn(`[sendNotifications] Admin not found for futsal ${tournament.futsalId} for tournament ${tournament._id}`); 
            }
          } else {
              console.warn(`[sendNotifications] Futsal ID missing for tournament ${tournament._id}, cannot notify admin.`);
          }
        } catch (error) {
          // Keep error log
          console.error(`[sendNotifications] Error sending ${playerType}/${adminType} notifications for tournament ${tournament._id}:`, error);
        }
      };
      
      for (const tournament of allTournaments) {
        // Reduced verbose logging per tournament
        // console.log(`\n[Status Update] Processing tournament: "${tournament.name}" (${tournament._id})`);
        // console.log(`[Status Update]   Current status: ${tournament.status}`);
        
        // Extract all relevant date and time components
        const regDeadlineDate = tournament.registrationDeadline;
        const regDeadlineTime = tournament.registrationDeadlineTime || '23:59';
        const startDate = tournament.startDate;
        const startTime = tournament.startTime || '00:00';
        const endDate = tournament.endDate;

        // --- Add Log Here ---
        console.log(`[DEBUG] Read tournament.endTime: ${tournament.endTime}, Type: ${typeof tournament.endTime}`);
        // --- End Add Log ---

        const endTime = tournament.endTime || '23:59'; // Default to end of day for end date
        
        // Create full date-time objects by combining date and time
        const fullRegDeadline = combineDateAndTime(regDeadlineDate, regDeadlineTime);
        const fullStartDate = combineDateAndTime(startDate, startTime);
        const fullEndDate = combineDateAndTime(endDate, endTime);
        
        // Minimal essential date logging
        // console.log(`[Status Update]   Full start date: ${fullStartDate?.toISOString() || 'undefined'}`);
        // console.log(`[Status Update]   Full end date: ${fullEndDate?.toISOString() || 'undefined'}`);
        // console.log(`[Status Update]   Current time: ${now.toISOString()}`);
        
        // Check if the tournament is already cancelled - don't modify its status
        if (tournament.status === 'Cancelled (Low Teams)') {
          // console.log(`[Status Update]   Tournament is cancelled. Skipping status update.`); // Reduced noise
          continue;
        }
        
        // Registration closed check
        if (!tournament.registrationClosed && fullRegDeadline && fullRegDeadline < now) {
          // console.log(`[Status Update]   Registration deadline has passed. Closing registration.`); // Reduced noise
          tournament.registrationClosed = true;
          statusChanges.registrationClosed++;
          // Don't save immediately, let status change logic handle save
        }
        
        // Status transition logic with time component properly considered
        let statusChanged = false;
        const oldStatus = tournament.status;
        let notificationTasks = []; // Collect notification tasks
        
        // --- Add Log Here ---
        console.log(`[CHECKING END CONDITION for ${tournament._id}] Now: ${now.toISOString()}, Full End Date: ${fullEndDate?.toISOString() || 'N/A'}, Comparison Result: ${fullEndDate && now > fullEndDate}`);
        // --- End Add Log ---

        if (fullEndDate && now > fullEndDate) {
          // Tournament has ended
          if (tournament.status !== 'Completed') {
            console.log(`[Status Update] DETECTED change to 'Completed' for ${tournament._id}`); 
            console.log(`[Status Update]   Tournament end date has passed. Marking as Completed.`);
            console.log(`[Status Update]   Now (${now.toISOString()}) > End Date (${fullEndDate.toISOString()})`);
            tournament.status = 'Completed';
            statusChanged = true;
            statusChanges.ongoingToCompleted++;
            // Add notification task for 'Completed'
            // console.log(`[Status Update] Queuing 'Completed' notification task for ${tournament._id}`); // Less verbose
            notificationTasks.push(() => sendNotifications(
              tournament,
              'tournament_end', 
              'tournament_end_admin',
              `Tournament Ended: ${tournament.name}`,
              (t, p) => `The tournament "${t.name}" has concluded. Check the results!`, // Player message
              `Tournament Ended: ${tournament.name}`,
              (t, pCount) => `The tournament "${t.name}" (${pCount} participants) has concluded.` // Admin message
            ));
          }
        } else if (fullStartDate && now >= fullStartDate) {
          // Tournament has started but not ended
          if (tournament.status !== 'Ongoing') {
             console.log(`[Status Update] DETECTED change to 'Ongoing' for ${tournament._id}`);
            console.log(`[Status Update]   Tournament has started. Marking as Ongoing.`);
            console.log(`[Status Update]   Start Date (${fullStartDate.toISOString()}) <= Now (${now.toISOString()}) < End Date (${fullEndDate.toISOString()})`);
            tournament.status = 'Ongoing';
            statusChanged = true;
            statusChanges.upcomingToOngoing++;
            // Add notification task for 'Ongoing'
             // console.log(`[Status Update] Queuing 'Ongoing' notification task for ${tournament._id}`); // Less verbose
             notificationTasks.push(() => sendNotifications(
              tournament,
              'tournament_start', 
              'tournament_start_admin',
              `Tournament Starting: ${tournament.name}`,
              (t, p) => `The tournament "${t.name}" is starting now! Good luck!`, // Player message
              `Tournament Starting: ${tournament.name}`,
              (t, pCount) => `The tournament "${t.name}" (${pCount} participants) is starting now.` // Admin message
            ));
          }
        } else if (tournament.status !== 'Upcoming') {
          // Tournament has not started yet but is marked with another status
          // console.log(`[Status Update]   Setting status to Upcoming.`); // Reduced noise
          console.log(`[Status Update]   Setting status to Upcoming.`);
          console.log(`[Status Update]   Now (${now.toISOString()}) < Start Date (${fullStartDate.toISOString()})`);
          tournament.status = 'Upcoming';
          statusChanged = true;
        }
        
        // Save if status or registration closed flag changed
        if (statusChanged || (tournament.registrationClosed && !tournament.wasRegistrationClosed)) { 
          // console.log(`[Status Update] Saving changes for tournament ${tournament._id}. New status: ${tournament.status}`); // Less verbose
          tournament.wasRegistrationClosed = tournament.registrationClosed; 
          await tournament.save();
          
          if (notificationTasks.length > 0) {
              console.log(`[Status Update] EXECUTING ${notificationTasks.length} notification task(s) for ${tournament._id}`); 
              for (const task of notificationTasks) {
                  await task(); 
              }
          } else if (statusChanged) {
              // console.log(`[Status Update] Status changed for ${tournament._id} but NO notification tasks queued.`); // Less verbose
          }
        } else {
          // console.log(`[Status Update]   No status change needed. Status remains: ${tournament.status}`); // Reduced noise
        }
      }
  
      // console.log('\n[Status Update] Tournament statuses update completed summary:'); // Less verbose
      // console.log(` - Reg Closed: ${statusChanges.registrationClosed}, Ongoing: ${statusChanges.upcomingToOngoing}, Completed: ${statusChanges.ongoingToCompleted}`);
      
      return statusChanges;
    } catch (error) {
      console.error('[Status Update] Error updating tournament statuses:', error); // Keep error log
      return { error: error.message };
    }
};

// Function to manually update a specific tournament's status
const updateSingleTournamentStatus = async (tournamentId) => {
  try {
    if (!tournamentId) {
      return { success: false, message: 'Tournament ID is required' };
    }
    
    const now = new Date();
    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }
    
    // Extract all time components for proper comparison
    const regDeadlineTime = tournament.registrationDeadlineTime || '23:59';
    const startTime = tournament.startTime || '00:00';
    const endTime = tournament.endTime || '23:59';
    
    // Create full date-time objects
    const fullRegDeadline = combineDateAndTime(tournament.registrationDeadline, regDeadlineTime);
    const fullStartDate = combineDateAndTime(tournament.startDate, startTime);
    const fullEndDate = combineDateAndTime(tournament.endDate, endTime);
    
    // Debug info with detailed time information
    console.log(`[Manual Status Update] Checking tournament ${tournament.name} (${tournamentId})`);
    console.log(`[Manual Status Update] Current status: ${tournament.status}`);
    console.log(`[Manual Status Update] Registration deadline: ${tournament.registrationDeadline?.toISOString() || 'undefined'} at time ${regDeadlineTime}`);
    console.log(`[Manual Status Update] Full registration deadline: ${fullRegDeadline?.toISOString() || 'undefined'}`);
    console.log(`[Manual Status Update] Start date: ${tournament.startDate?.toISOString() || 'undefined'} at time ${startTime}`);
    console.log(`[Manual Status Update] Full start date: ${fullStartDate?.toISOString() || 'undefined'}`);
    console.log(`[Manual Status Update] End date: ${tournament.endDate?.toISOString() || 'undefined'} at time ${endTime}`);
    console.log(`[Manual Status Update] Full end date: ${fullEndDate?.toISOString() || 'undefined'}`);
    console.log(`[Manual Status Update] Current time: ${now.toISOString()}`);
    
    // Get the expected status based on the current date and tournament dates
    // with proper time component handling
    let expectedStatus = 'Upcoming'; // Default
    
    // A tournament is only Completed if the end date (with time) has fully passed
    if (fullEndDate && now > fullEndDate) {
      console.log(`[Manual Status Update] Tournament end date+time has passed. Expected status: Completed`);
      console.log(`[Manual Status Update] Now (${now.toISOString()}) > End Date (${fullEndDate.toISOString()})`);
      expectedStatus = 'Completed';
    } else if (fullStartDate && now >= fullStartDate) {
      console.log(`[Manual Status Update] Tournament has started but not ended. Expected status: Ongoing`);
      console.log(`[Manual Status Update] Start (${fullStartDate.toISOString()}) <= Now (${now.toISOString()}) < End (${fullEndDate.toISOString()})`);
      expectedStatus = 'Ongoing';
    } else {
      console.log(`[Manual Status Update] Tournament has not started yet. Expected status: Upcoming`);
      console.log(`[Manual Status Update] Now (${now.toISOString()}) < Start Date (${fullStartDate.toISOString()})`);
    }
    
    // Don't change the status if it's already Cancelled
    if (tournament.status === 'Cancelled (Low Teams)') {
      console.log(`[Manual Status Update] Tournament is cancelled, keeping status as is`);
      return { 
        success: true, 
        message: 'Tournament is cancelled, status unchanged',
        status: tournament.status,
        statusChanged: false
      };
    }
    
    console.log(`[Manual Status Update] Expected status: ${expectedStatus}`);
    
    if (tournament.status !== expectedStatus) {
      const oldStatus = tournament.status;
      tournament.status = expectedStatus;
      await tournament.save();
      
      console.log(`[Manual Status Update] Updated status from ${oldStatus} to ${expectedStatus}`);
      
      return { 
        success: true, 
        message: `Tournament status updated from ${oldStatus} to ${expectedStatus}`,
        oldStatus,
        newStatus: expectedStatus,
        statusChanged: true
      };
    } else {
      console.log(`[Manual Status Update] No status change needed, already ${expectedStatus}`);
      
      return { 
        success: true, 
        message: 'Tournament status is already correct',
        status: tournament.status,
        statusChanged: false
      };
    }
    
  } catch (error) {
    console.error('[Manual Status Update] Error:', error);
    return { success: false, message: error.message };
  }
};

module.exports = { 
  updateTournamentStatuses,
  updateSingleTournamentStatus
};