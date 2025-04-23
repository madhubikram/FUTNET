// dbCheck.js
require('dotenv').config();
const mongoose = require('mongoose');
// Import all required models to avoid schema registration errors
require('./models/user.model');
require('./models/court.model');
const { FreeSlots } = require('./models/freeSlots.model');

async function checkFreeSlots() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    console.log('\n=== FREE SLOTS COLLECTION DATA ===');
    // Don't use populate to avoid model issues
    const freeSlots = await FreeSlots.find({});
      
    if (freeSlots.length === 0) {
      console.log('No free slots records found in the database');
    } else {
      console.log(`Found ${freeSlots.length} free slots records`);
      
      freeSlots.forEach((slot, index) => {
        console.log(`\n--- RECORD ${index + 1} ---`);
        console.log(`User ID: ${slot.user}`);
        console.log(`Court ID: ${slot.court}`);
        console.log(`Date: ${slot.date ? new Date(slot.date).toISOString().split('T')[0] : 'Unknown'}`);
        console.log(`Remaining Slots: ${slot.remainingSlots}`);
        console.log(`Created: ${slot.createdAt}`);
        console.log(`Updated: ${slot.updatedAt}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

checkFreeSlots(); 