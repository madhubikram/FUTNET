const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contactNumber: { type: String, required: true },
  role: { type: String, enum: ['player', 'futsalAdmin', 'superAdmin'], required: true },
  panNumber: { type: String, required: function() { return this.role === 'futsalAdmin'; } },
  documents: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  freeBookingsUsed: { 
    type: Number, 
    default: 0 
  },
  futsalName: { 
    type: String, 
    required: function() { 
      return this.role === 'futsalAdmin'; 
    }
  },

  verificationStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'],
    default: function() {
      return this.role === 'futsalAdmin' ? 'pending' : 'approved'
    }
  },
  profileCompleted: {
    type: Boolean,
    default: false
},
futsal: { 
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Futsal'
},
loyalty: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Loyalty'
},
// Field to store the Web Push subscription object
pushSubscription: {
  endpoint: { type: String },
  keys: {
    p256dh: { type: String },
    auth: { type: String }
  },
  // Select: false ensures it's not returned by default unless explicitly requested
  // select: false 
  // Note: Keep select as true (default) or remove select:false for the notification service to retrieve it.
  // If you make it select: false, ensure notification.service.js uses .select('+pushSubscription') when finding the user.
}
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);