const webpush = require('web-push');
const Notification = require('../models/notification.model');
const User = require('../models/user.model'); // Assuming user model stores pushSubscription

// Configure web-push with VAPID details
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:your_email@example.com', // Replace with your admin email
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('[Notification Service] Web Push configured.');
} else {
  console.warn('[Notification Service] VAPID keys not found in .env. Push notifications will be disabled.');
}

/**
 * Creates a notification in the database and optionally sends a push notification.
 * @param {string} userId - The ID of the user receiving the notification.
 * @param {string} title - The title of the notification.
 * @param {string} message - The main content of the notification.
 * @param {string} type - The type of notification (enum from Notification model).
 * @param {string} [link] - Optional link for the notification.
 * @param {boolean} [sendPush=true] - Whether to attempt sending a push notification.
 */
const createNotification = async (userId, title, message, type, link = null, sendPush = true) => {
  console.log(`[Notification Service] Attempting to create notification: User=${userId}, Type=${type}, Title=${title}`);
  try {
    // 1. Save notification to database
    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
      link,
    });
    await notification.save();
    console.log(`[Notification Service] DB Save SUCCESS: User=${userId}, Type=${type}, NotificationID=${notification._id}`);

    // 2. Send push notification if enabled and configured
    if (sendPush && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      console.log(`[Notification Service] Attempting to send push for User=${userId}, NotificationID=${notification._id}`);
      const user = await User.findById(userId).select('+pushSubscription');

      if (user && user.pushSubscription && user.pushSubscription.endpoint) {
        console.log(`[Notification Service] Found push subscription for User=${userId}`);
        const payload = JSON.stringify({
          title,
          options: {
            body: message,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            data: {
              url: link || `/notifications`,
              notificationId: notification._id
            },
            tag: notification._id.toString()
          }
        });

        try {
          await webpush.sendNotification(user.pushSubscription, payload);
          console.log(`[Notification Service] Push Sent SUCCESS: User=${userId}, NotificationID=${notification._id}`);
        } catch (pushError) {
          console.error(`[Notification Service] Error sending push notification to user ${userId}:`, pushError);
          // Handle specific errors, e.g., subscription expired (status code 410)
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            console.log(`[Notification Service] Push subscription expired or invalid for user ${userId}. Removing.`);
            // Optionally remove the expired subscription from the user model
            // await User.findByIdAndUpdate(userId, { $unset: { pushSubscription: "" } });
             user.pushSubscription = undefined; // Or set to null/undefined
             await user.save();
          }
        }
      } else {
         console.log(`[Notification Service] Push SKIPPED: User ${userId} has no valid push subscription.`);
      }
    } else if (sendPush) {
         console.log(`[Notification Service] Push SKIPPED: VAPID keys not configured.`);
    }
     return notification;
  } catch (error) {
    console.error(`[Notification Service] DB Save FAILED or other error: User=${userId}, Type=${type}, Error:`, error);
     throw error; 
  }
};

module.exports = {
  createNotification,
}; 