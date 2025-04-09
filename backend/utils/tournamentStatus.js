// utils/tournamentStatus.js
const Tournament = require('../models/tournament.model');

/**
 * Combines a date and time string into a full Date object
 * @param {Date} dateObj - Date object (without specific time)
 * @param {String} timeStr - Time string in format "HH:MM" 
 * @returns {Date} Combined date and time
 */
const combineDateAndTime = (dateObj, timeStr) => {
  if (!dateObj) {
    console.error('[Date Utility] Invalid date object provided');
    return null;
  }
  
  // Create a new date object to avoid mutating the original
  const result = new Date(dateObj);
  
  // If time string is provided, set the time component
  if (timeStr && typeof timeStr === 'string') {
    const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
    if (!isNaN(hours) && !isNaN(minutes)) {
      result.setHours(hours, minutes, 0, 0); // Set hours and minutes, zero out seconds and ms
    } else {
      console.warn(`[Date Utility] Invalid time format: "${timeStr}". Expected "HH:MM"`);
    }
  }
  
  return result;
};

const updateTournamentStatuses = async () => {
    try {
      const now = new Date();
      console.log(`[Status Update] Running tournament status update at ${now.toISOString()}`);
      console.log(`[Status Update] Current date: ${now.toDateString()}, time: ${now.toTimeString()}`);
  
      // Find all tournaments to handle each one individually with proper time handling
      const allTournaments = await Tournament.find({});
      console.log(`[Status Update] Found ${allTournaments.length} tournaments to process`);
      
      let statusChanges = {
        registrationClosed: 0,
        upcomingToOngoing: 0,
        ongoingToCompleted: 0
      };
      
      for (const tournament of allTournaments) {
        console.log(`\n[Status Update] Processing tournament: "${tournament.name}" (${tournament._id})`);
        console.log(`[Status Update]   Current status: ${tournament.status}`);
        
        // Extract all relevant date and time components
        const regDeadlineDate = tournament.registrationDeadline;
        const regDeadlineTime = tournament.registrationDeadlineTime || '23:59'; // Default to end of day if not specified
        const startDate = tournament.startDate;
        const startTime = tournament.startTime || '00:00'; // Default to start of day if not specified
        const endDate = tournament.endDate;
        const endTime = tournament.startTime || '23:59'; // Default to end of day for end date
        
        // Create full date-time objects by combining date and time
        const fullRegDeadline = combineDateAndTime(regDeadlineDate, regDeadlineTime);
        const fullStartDate = combineDateAndTime(startDate, startTime);
        const fullEndDate = combineDateAndTime(endDate, endTime);
        
        // Log detailed timestamp information
        console.log(`[Status Update]   Registration deadline: ${regDeadlineDate?.toISOString() || 'undefined'} at time ${regDeadlineTime}`);
        console.log(`[Status Update]   Full registration deadline: ${fullRegDeadline?.toISOString() || 'undefined'}`);
        console.log(`[Status Update]   Start date: ${startDate?.toISOString() || 'undefined'} at time ${startTime}`);
        console.log(`[Status Update]   Full start date: ${fullStartDate?.toISOString() || 'undefined'}`);
        console.log(`[Status Update]   End date: ${endDate?.toISOString() || 'undefined'} at time ${endTime}`);
        console.log(`[Status Update]   Full end date: ${fullEndDate?.toISOString() || 'undefined'}`);
        console.log(`[Status Update]   Current time: ${now.toISOString()}`);
        
        // Check if the tournament is already cancelled - don't modify its status
        if (tournament.status === 'Cancelled (Low Teams)') {
          console.log(`[Status Update]   Tournament is cancelled. Skipping status update.`);
          continue;
        }
        
        // Registration closed check
        if (!tournament.registrationClosed && fullRegDeadline && fullRegDeadline < now) {
          console.log(`[Status Update]   Registration deadline has passed. Closing registration.`);
          tournament.registrationClosed = true;
          statusChanges.registrationClosed++;
          await tournament.save();
        }
        
        // Status transition logic with time component properly considered
        let statusChanged = false;
        const oldStatus = tournament.status;
        
        // Determine correct status based on dates with time
        if (fullEndDate && now > fullEndDate) {
          // Tournament has ended
          if (tournament.status !== 'Completed') {
            console.log(`[Status Update]   Tournament end date has passed. Marking as Completed.`);
            console.log(`[Status Update]   Now (${now.toISOString()}) > End Date (${fullEndDate.toISOString()})`);
            tournament.status = 'Completed';
            statusChanged = true;
            statusChanges.ongoingToCompleted++;
          }
        } else if (fullStartDate && now >= fullStartDate) {
          // Tournament has started but not ended
          if (tournament.status !== 'Ongoing') {
            console.log(`[Status Update]   Tournament has started but not ended. Marking as Ongoing.`);
            console.log(`[Status Update]   Start Date (${fullStartDate.toISOString()}) <= Now (${now.toISOString()}) < End Date (${fullEndDate.toISOString()})`);
            tournament.status = 'Ongoing';
            statusChanged = true;
            statusChanges.upcomingToOngoing++;
          }
        } else if (tournament.status !== 'Upcoming') {
          // Tournament has not started yet but is marked with another status
          console.log(`[Status Update]   Tournament has incorrect status. Should be Upcoming.`);
          console.log(`[Status Update]   Now (${now.toISOString()}) < Start Date (${fullStartDate.toISOString()})`);
          tournament.status = 'Upcoming';
          statusChanged = true;
        }
        
        // Save if status changed
        if (statusChanged) {
          console.log(`[Status Update]   Changing status from ${oldStatus} to ${tournament.status}`);
          await tournament.save();
        } else {
          console.log(`[Status Update]   No status change needed. Status remains: ${tournament.status}`);
        }
      }
  
      console.log('\n[Status Update] Tournament statuses update completed with the following changes:');
      console.log(`[Status Update] - Registration closed for ${statusChanges.registrationClosed} tournaments`);
      console.log(`[Status Update] - Changed ${statusChanges.upcomingToOngoing} tournaments from Upcoming to Ongoing`);
      console.log(`[Status Update] - Changed ${statusChanges.ongoingToCompleted} tournaments from Ongoing to Completed`);
      
      return statusChanges;
    } catch (error) {
      console.error('[Status Update] Error updating tournament statuses:', error);
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
    const endTime = tournament.startTime || '23:59';
    
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