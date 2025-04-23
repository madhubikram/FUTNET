const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/user.model'); // Adjust path if necessary

// Load environment variables from .env file in the backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const usernames = [
  'mamilagurung',
  'sakarpaudel',
  'navarasshrestha',
  'ramannath'
];

async function seedUsers() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Error: MONGODB_URI not found in environment variables.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully.');

    for (const username of usernames) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ username: username });
        if (existingUser) {
          console.log(`User "${username}" already exists. Skipping.`);
          continue;
        }

        // Create new user object
        // Note: Password will be hashed automatically by the pre-save hook in user.model.js
        const newUser = new User({
          username: username,
          password: username, // Using username as password (will be hashed)
          firstName: username.charAt(0).toUpperCase() + username.slice(1), // Simple first name
          lastName: 'User', // Simple last name
          email: `${username}@example.com`, // Dummy email
          contactNumber: '9800000000', // Dummy contact number
          role: 'player', // Default role
          profileCompleted: false, // Default profile status
          verificationStatus: 'approved' // Players are auto-approved
          // Add any other required fields with default values if necessary
        });

        // Save the user
        await newUser.save();
        console.log(`Successfully created user: "${username}"`);

      } catch (userError) {
        console.error(`Error creating user "${username}":`, userError.message);
        // Continue to the next user even if one fails
      }
    }

  } catch (error) {
    console.error('Error connecting to MongoDB or during seeding process:', error.message);
  } finally {
    // Ensure disconnection even if errors occur
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

// Run the seeding function
seedUsers(); 