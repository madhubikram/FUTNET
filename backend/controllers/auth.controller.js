const User = require('../models/user.model'); 
const jwt = require('jsonwebtoken');     
const { uploadToBlob } = require('../utils/blobUpload');

const register = async (req, res) => {  
  console.log('Registration request received:', req.body); 
  console.log('Files received:', req.files ? `${req.files.length} files` : 'No files');
  console.log('Contact number in request:', req.body.contactNumber);

  try {
    const { 
      email, 
      username, 
      firstName,
      lastName,
      password,
      role,
      contactNumber, 
      panNumber,
      futsalName
  } = req.body;

  console.log('Extracted fields:', {
    email,
    username,
    firstName,
    lastName,
    role,
    contactNumber,
    panNumber,
    futsalName
});

  if (!contactNumber) {
    console.log('Contact number missing from request');
    return res.status(400).json({ 
        message: 'Registration failed', 
        error: 'Contact number is required' 
    });
  }

      // Check for existing user
      const conditions = [
        { email },
        { username },
        { contactNumber }
      ];
      if (role === 'futsalAdmin' && panNumber) {
        conditions.push({ panNumber });
      }
      const existingUser = await User.findOne({
        $or: conditions
      });
      
      if (existingUser) {
        let errorMessage = '';
        if (existingUser.email === email) {
          errorMessage = 'Email already exists';
        } else if (existingUser.username === username) {
          errorMessage = 'Username already exists';
        } else if (existingUser.contactNumber === contactNumber) {
          errorMessage = 'Contact number already registered';
        } else if (role === 'futsalAdmin' && existingUser.panNumber === panNumber) {
          errorMessage = 'PAN number already registered';
        }
        return res.status(400).json({ message: errorMessage });
      }
           // Handle uploaded files - Upload to Blob Storage
           const documentUrls = []; // Store Blob URLs here
           if (req.files && req.files.length > 0) {
             console.log(`Attempting to upload ${req.files.length} documents...`);
             try {
               for (const file of req.files) {
                 // Construct a path prefix including the user ID (or temp ID if needed)
                 // NOTE: We don't have user._id yet, so use username or a temp identifier
                 const blobPathPrefix = `user-documents/${username}/`; 
                 const blobUrl = await uploadToBlob('uploads', file.buffer, file.originalname, blobPathPrefix);
                 documentUrls.push(blobUrl);
                 console.log(`Uploaded document for ${username}: ${blobUrl}`);
               }
             } catch (uploadError) {
               console.error('Error uploading documents to blob storage:', uploadError);
               // Decide if registration should fail if upload fails
               return res.status(500).json({
                 message: 'Failed to upload documents',
                 error: uploadError.message
               });
             }
           }

           // Create user data object
           const userData = {
               firstName,
               lastName,
               username,
               email,
               password,
               role,
               contactNumber,
               documents: documentUrls
           };
     
           // Add futsal admin specific fields
           if (role === 'futsalAdmin') {
               userData.panNumber = panNumber;
               userData.futsalName = futsalName;
               userData.verificationStatus = 'pending';
           }
     
           console.log('Creating user with data:', userData);
     
           // Create and save user
           const user = new User(userData);
           await user.save();
     
           const token = jwt.sign(
               { userId: user._id },
               process.env.JWT_SECRET,
               { expiresIn: '24h' }
           );
     
           res.status(201).json({
               message: 'Registration successful',
               token,
               user: {
                   id: user._id,
                   username: user.username,
                   email: user.email,
                   role: user.role,
                   verificationStatus: user.verificationStatus,
                   documents: user.documents
               }
           });
       } catch (error) {
           console.error('Registration error:', error);
           console.error('Error stack:', error.stack);
           res.status(500).json({
               message: 'Registration failed',
               error: error.message
           });
       }
     };

// auth.controller.js
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check verification status for futsal admins
    if (user.role === 'futsalAdmin') {
      if (user.verificationStatus === 'pending') {
        return res.status(401).json({ 
          message: 'Your account is pending verification' 
        });
      }
      if (user.verificationStatus === 'rejected') {
        // Delete rejected user
        await User.deleteOne({ _id: user._id });
        return res.status(401).json({ 
          message: 'Your registration has been rejected' 
        });
      }
    }

    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus,
        profileCompleted: user.profileCompleted
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Login failed', 
      error: error.message 
    });
  }
};

module.exports = { login };
console.log('Exporting from controller:', { register, login });
module.exports = { register, login }; 