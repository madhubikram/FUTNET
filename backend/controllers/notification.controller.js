const Notification = require('../models/notification.model');
const User = require('../models/user.model');

// Controller to save push subscription
exports.saveSubscription = async (req, res) => {
  const subscription = req.body.subscription;
  const userId = req.user._id; // Assuming auth middleware attaches user

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ message: 'Invalid subscription object provided.' });
  }

  try {
    // Find user and update their push subscription
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.pushSubscription = {
        endpoint: subscription.endpoint,
        keys: subscription.keys
    };
    await user.save();

    console.log(`[Notification Controller] Push subscription saved for user ${userId}`);
    res.status(200).json({ message: 'Subscription saved successfully.' });

  } catch (error) {
    console.error('[Notification Controller] Error saving subscription:', error);
    res.status(500).json({ message: 'Failed to save subscription.', error: error.message });
  }
};

// Controller to get notifications for the logged-in user
exports.getNotifications = async (req, res) => {
  const userId = req.user._id;
  const limit = parseInt(req.query.limit) || 20; // Default limit
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  try {
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit);
      
    const totalNotifications = await Notification.countDocuments({ user: userId });
    const unreadCount = await Notification.countDocuments({ user: userId, read: false });

    res.status(200).json({
      notifications,
      currentPage: page,
      totalPages: Math.ceil(totalNotifications / limit),
      totalNotifications,
      unreadCount
    });
  } catch (error) {
    console.error('[Notification Controller] Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications.', error: error.message });
  }
};

// Controller to mark a single notification as read
exports.markAsRead = async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user._id;

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId }, // Ensure user owns the notification
      { read: true },
      { new: true } // Return the updated document
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or user unauthorized.' });
    }

    res.status(200).json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    console.error('[Notification Controller] Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read.', error: error.message });
  }
};

// Controller to mark all notifications as read for the user
exports.markAllAsRead = async (req, res) => {
  const userId = req.user._id;

  try {
    const result = await Notification.updateMany(
      { user: userId, read: false }, // Only update unread notifications for the user
      { read: true }
    );

    console.log(`[Notification Controller] Marked ${result.modifiedCount} notifications as read for user ${userId}`);
    res.status(200).json({ message: 'All notifications marked as read.', modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('[Notification Controller] Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read.', error: error.message });
  }
}; 