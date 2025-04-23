// fixFreeSlots.js
require('dotenv').config();
const mongoose = require('mongoose');
// Import all required models
require('./models/user.model');
require('./models/court.model');
const { FreeSlots } = require('./models/freeSlots.model');

async function fixFreeSlots() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    console.log('\n=== CHECKING FOR NEGATIVE FREE SLOTS VALUES ===');
    // Find records with negative remaining slots
    const negativeRecords = await FreeSlots.find({ remainingSlots: { $lt: 0 } });
      
    if (negativeRecords.length === 0) {
      console.log('No negative slot records found in the database');
    } else {
      console.log(`Found ${negativeRecords.length} records with negative remaining slots values`);
      
      // Update all negative records to have 0 remaining slots
      const updateResult = await FreeSlots.updateMany(
        { remainingSlots: { $lt: 0 } },
        { $set: { remainingSlots: 0 } }
      );
      
      console.log(`Updated ${updateResult.modifiedCount} records with negative values to 0`);
    }
    
    // Find records with missing required fields
    const incompleteRecords = await FreeSlots.find({ 
      $or: [
        { user: { $exists: false } },
        { court: { $exists: false } },
        { date: { $exists: false } }
      ] 
    });
    
    if (incompleteRecords.length > 0) {
      console.log(`Found ${incompleteRecords.length} incomplete records without required fields`);
      
      for (const record of incompleteRecords) {
        console.log(`Deleting incomplete record: ${record._id}`);
        await FreeSlots.findByIdAndDelete(record._id);
      }
      
      console.log(`Deleted ${incompleteRecords.length} incomplete records`);
    } else {
      console.log('No incomplete records found');
    }
    
    // Clean up all existing records for a fresh start
    console.log('\n=== REMOVING ALL EXISTING FREE SLOTS RECORDS ===');
    const deleteResult = await FreeSlots.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} free slots records for a fresh start`);
    
    // Verify the fixes
    const remainingNegativeRecords = await FreeSlots.find({ remainingSlots: { $lt: 0 } });
    const totalRecords = await FreeSlots.countDocuments();
    console.log(`Total free slots records after cleanup: ${totalRecords}`);
    
    if (remainingNegativeRecords.length === 0) {
      console.log('✅ Success! No more negative slot records in the database');
    } else {
      console.log(`⚠️ Warning: ${remainingNegativeRecords.length} negative records still exist`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

fixFreeSlots(); 