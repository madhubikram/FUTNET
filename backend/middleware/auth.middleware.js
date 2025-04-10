const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const authMiddleware = async (req, res, next) => {
  try {
    console.log('[AUTH] Processing authentication middleware');
    
    // Check if Authorization header exists
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      console.log('[AUTH] No authorization header found');
      return res.status(401).json({ message: 'No authorization header found' });
    }

    // Extract and verify token
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      console.log('[AUTH] No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.userId) {
      console.log('[AUTH] Invalid token format');
      return res.status(401).json({ message: 'Invalid token format' });
    }

    console.log(`[AUTH] Token verified, finding user: ${decoded.userId}`);
    
    // Find user
    const user = await User.findById(decoded.userId).populate('futsal');
    
    if (!user) {
      console.log(`[AUTH] User not found for ID: ${decoded.userId}`);
      return res.status(401).json({ message: 'User not found' });
    }

    console.log(`[AUTH] User found:`, {
      userId: user._id,
      role: user.role,
      hasFutsal: !!user.futsal,
      futsalId: user.futsal ? user.futsal._id || 'Invalid futsal object' : 'No futsal'
    });

    // Add check for futsal admin without futsal
    if (user.role === 'futsalAdmin' && !user.futsal) { 
      console.log('[AUTH] Futsal admin without futsal property');
      
      // Allow profile-related routes needed for profile completion
      const profileEndpoints = ['/profile', '/futsal/profile'];
      const isAllowedProfileRoute = profileEndpoints.some(endpoint => 
        req.path === endpoint || req.originalUrl.endsWith(endpoint)
      );
      
      if (!isAllowedProfileRoute) {
        console.log('[AUTH] Futsal admin without futsal trying to access restricted route');
        return res.status(400).json({ 
          message: 'Futsal profile not found. Please complete your profile setup.' 
        });
      }
      
      console.log('[AUTH] Allowing access to profile setup route');
    }
    
    // Attach user and token to request
    req.user = user;
    req.token = token;
    console.log(`[AUTH] Authentication successful for user: ${user._id}`);
    next();

  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = authMiddleware;