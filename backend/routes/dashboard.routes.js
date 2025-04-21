const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middleware/auth.middleware'); // Imports the single auth function

// Function to authorize roles inline
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient role permissions' });
    }
    next();
  };
};

// Protect dashboard routes
router.use(authMiddleware); // Use the imported authentication middleware
router.use(authorizeRole(['futsalAdmin'])); // Use the inline authorization middleware - ONLY futsalAdmin

// Define dashboard data routes
router.get('/counts', dashboardController.getCounts);
router.get('/trends/bookings', dashboardController.getBookingTrends);
router.get('/trends/revenue', dashboardController.getRevenueTrends);
router.get('/distribution/booking-status', dashboardController.getBookingStatusDistribution);
// router.get('/distribution/user-roles', dashboardController.getUserRolesDistribution); // Removed route
router.get('/distribution/payment-methods', dashboardController.getPaymentMethodsDistribution);
router.get('/tournaments/upcoming-list', dashboardController.getUpcomingTournamentsList);
// Add routes for other data points

module.exports = router; 