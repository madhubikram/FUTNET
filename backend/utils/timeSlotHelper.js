const TimeSlot = require('../models/timeSlot.model');

/**
 * Creates a TimeSlot if it doesn't exist
 * @param {string} courtId - The ID of the court
 * @param {Date} date - The booking date
 * @param {string} startTime - The start time in HH:MM format
 * @param {string} endTime - The end time in HH:MM format
 * @returns {Promise<Object>} The TimeSlot document
 */
const getOrCreateTimeSlot = async (courtId, date, startTime, endTime) => {
  try {
    // Ensure date is a Date object
    const bookingDate = date instanceof Date ? date : new Date(date);
    if (isNaN(bookingDate.getTime())) {
      throw new Error('Invalid date provided to getOrCreateTimeSlot');
    }

    const year = bookingDate.getUTCFullYear(); // Use UTC to avoid timezone issues
    const month = bookingDate.getUTCMonth();
    const day = bookingDate.getUTCDate();
    
    // Parse start time
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startDateTime = new Date(Date.UTC(year, month, day, startHour, startMinute)); // Use UTC
    
    // Parse end time
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const endDateTime = new Date(Date.UTC(year, month, day, endHour, endMinute)); // Use UTC

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error('Invalid time strings provided, could not create Date objects.');
    }

    // --- Robust TimeSlot Finding --- 
    // Query for a timeslot that starts exactly at startDateTime
    console.log(`[TimeSlot Helper] Querying for TimeSlot - Court: ${courtId}, Start: ${startDateTime.toISOString()}, End: ${endDateTime.toISOString()}`);
    
    let timeSlot = await TimeSlot.findOne({
      court: courtId,
      startTime: startDateTime, // Match exact start time
      // We don't strictly need to match endTime here, start time + court is usually unique enough for a slot
    });

    console.log(`[TimeSlot Helper] Found timeslot?: ${timeSlot ? timeSlot._id : 'No'}`);

    // If no exact match found, try a small range (e.g., +/- 1 minute) - This is a fallback
    if (!timeSlot) {
        console.log(`[TimeSlot Helper] No exact match found, trying range query...`);
        const oneMinute = 60 * 1000;
        timeSlot = await TimeSlot.findOne({
            court: courtId,
            startTime: { 
                $gte: new Date(startDateTime.getTime() - oneMinute),
                $lte: new Date(startDateTime.getTime() + oneMinute)
            }
        });
        console.log(`[TimeSlot Helper] Found via range query?: ${timeSlot ? timeSlot._id : 'No'}`);
    }
    // --- End Robust Finding ---
    
    // If no time slot exists after checks, create one
    if (!timeSlot) {
      console.log(`[TimeSlot Helper] Creating new TimeSlot - Court: ${courtId}, Start: ${startDateTime.toISOString()}, End: ${endDateTime.toISOString()}`);
      timeSlot = new TimeSlot({
        court: courtId,
        startTime: startDateTime,
        endTime: endDateTime,
        isBooked: false // Ensure new slots are not booked
      });
      await timeSlot.save();
      console.log(`[TimeSlot Helper] New TimeSlot created: ${timeSlot._id}`);
    }
    
    return timeSlot;
  } catch (error) {
    console.error('[TimeSlot Helper] Error in getOrCreateTimeSlot:', error);
    // Re-throw the error so the calling function knows something went wrong
    throw error; 
  }
};

module.exports = {
  getOrCreateTimeSlot
}; 