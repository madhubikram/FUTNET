const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true // Index user field for faster querying
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  read: { 
    type: Boolean, 
    default: false 
  },
  // Enum to categorize notifications, useful for display or actions
  type: {
    type: String,
    enum: [
      'booking_confirmation', 'booking_reminder', 'booking_status_change', 
      'booking_pending',
      'payment_confirmation', 
      'payment_failed',
      'tournament_bracket', 'tournament_start', 'tournament_end', 'tournament_cancel',
      'tournament_pending',
      'tournament_confirmation',
      'loyalty_points', 'loyalty_points_received', 
      'system_alert',
      'new_booking_admin', 'booking_cancel_admin', 'payment_received_admin',
      'new_review_admin', 'review_reply',
      'tournament_fixture_reminder', 'tournament_start_admin', 'tournament_end_admin', 'tournament_cancel_admin'
    ],
    required: true
  },
  // Optional link to redirect user on click (e.g., to the specific booking or tournament page)
  link: { 
    type: String 
  },
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 