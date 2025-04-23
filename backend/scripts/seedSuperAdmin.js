const mongoose = require('mongoose');
const User = require('../models/user.model');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const superAdminCredentials = {
  firstName: 'Super',
  lastName: 'Admin',
  username: 'superadmin',
  email: 'superadmin@futnet.com',
  password: '123', 
  contactNumber: '9800000000',
  role: 'superAdmin',
  verificationStatus: 'approved'
};

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Clear any existing super admin and create new one
    await User.deleteMany({ role: 'superAdmin' });
    await User.create(superAdminCredentials);
    console.log('Super admin created successfully');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding super admin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();