// backend/models/tournament.registration.model.js

const mongoose = require('mongoose');

const tournamentRegistrationSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teamId: {
    type: String,
    required: true,
    unique: true
  },
  teamName: {
    type: String,
    required: true
  },
  players: [{
    username: String,
    contact: {
      type: String,
      required: true
    },
    fullName: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['captain', 'player', 'substitute'],
      required: true
    }
  }],
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'withdrawn', 'pending_payment'],
    default: 'pending_payment'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  purchaseOrderId: {
    type: String,
    index: true,
    sparse: true
  },
  pidx: {
    type: String,
    index: true,
    sparse: true
  },
  paymentDetails: {
    method: {
      type: String,
      enum: ['khalti', 'esewa']
    },
    transactionId: String,
    paidAmount: Number,
    paidAt: Date
  },
  reservationExpiresAt: {
    type: Date,
    index: { expires: '1m' }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TournamentRegistration', tournamentRegistrationSchema);