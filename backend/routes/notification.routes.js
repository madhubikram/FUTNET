const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware'); // Authentication middleware

// Protect all notification routes with authentication
router.use(authMiddleware);

// Route to save push subscription details
// POST /api/notifications/subscribe
router.post('/subscribe', notificationController.saveSubscription);

// Route to get user's notifications (paginated)
// GET /api/notifications?page=1&limit=10
router.get('/', notificationController.getNotifications);

// Route to mark a specific notification as read
// PATCH /api/notifications/:id/read
router.patch('/:id/read', notificationController.markAsRead);

// Route to mark all user's notifications as read
// PATCH /api/notifications/read-all
router.patch('/read-all', notificationController.markAllAsRead);

module.exports = router; 