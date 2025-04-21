const Loyalty = require('../models/loyalty.model');
const User = require('../models/user.model');
const Booking = require('../models/booking.model');
const LoyaltyTransaction = require('../models/loyaltyTransaction.model');

const loyaltyController = {
    // Get user's loyalty points
    getLoyaltyPoints: async (req, res) => {
        try {
          let loyalty = await Loyalty.findOne({ user: req.user._id })
            .populate({
              path: 'transactions.booking',
              select: 'date startTime endTime price'
            });
    
          if (!loyalty) {
            loyalty = new Loyalty({ user: req.user._id });
            await loyalty.save();
            
            await User.findByIdAndUpdate(req.user._id, { loyalty: loyalty._id });
          }
    
          res.json({ points: loyalty.points });
        } catch (error) {
          console.error('Error in getLoyaltyPoints:', error);
          res.status(500).json({ message: error.message });
        }
      },
    
      getPointsHistory: async (req, res) => {
        try {
          console.log(`[LOYALTY] Getting points history for user ${req.user._id}`);
          
          // Fetch embedded transactions from Loyalty model
          const loyalty = await Loyalty.findOne({ user: req.user._id })
            .populate({
              path: 'transactions.booking',
              select: 'date startTime endTime price'
            });
            
          console.log(`[LOYALTY] Found ${loyalty ? loyalty.transactions.length : 0} embedded transactions`);

          // Fetch standalone transactions from LoyaltyTransaction model
          const standaloneTransactions = await LoyaltyTransaction.find({ user: req.user._id })
            .populate({
              path: 'relatedBooking',
              select: 'date startTime endTime price'
            })
            .sort({ createdAt: -1 });
            
          console.log(`[LOYALTY] Found ${standaloneTransactions.length} standalone transactions`);
          
          if (standaloneTransactions.length > 0) {
            console.log(`[LOYALTY] First standalone transaction:`, JSON.stringify({
              id: standaloneTransactions[0]._id,
              type: standaloneTransactions[0].type,
              points: standaloneTransactions[0].points,
              reason: standaloneTransactions[0].reason,
              createdAt: standaloneTransactions[0].createdAt
            }));
          }

          // Convert standalone transactions to the same format as embedded ones
          const formattedStandaloneTransactions = standaloneTransactions.map(transaction => ({
            _id: transaction._id,
            type: transaction.type === 'credit' ? 'earn' : 'redeem',
            points: transaction.type === 'credit' ? transaction.points : -transaction.points,
            booking: transaction.relatedBooking,
            description: transaction.reason,
            date: transaction.createdAt
          }));

          // Merge both sources of transactions
          let allTransactions = [];
          
          // Include embedded transactions if loyalty record exists
          if (loyalty) {
            allTransactions = [...loyalty.transactions];
          }
          
          // Add standalone transactions
          allTransactions = [...allTransactions, ...formattedStandaloneTransactions];
          
          // Sort all transactions by date descending (newest first)
          allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
          
          console.log(`[LOYALTY] Returning ${allTransactions.length} total transactions`);

          res.json(allTransactions);
        } catch (error) {
          console.error('Error in getPointsHistory:', error);
          res.status(500).json({ message: error.message });
        }
      },

    // Calculate points for amount
    calculatePoints: async (req, res) => {
        try {
            const { amount } = req.body;
            const points = Loyalty.calculatePoints(amount);
            res.json({ points });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Check if points can be redeemed
    checkRedemption: async (req, res) => {
        try {
            const { points } = req.body;
            const loyalty = await Loyalty.findOne({ user: req.user._id });

            if (!loyalty) {
                return res.status(404).json({ message: 'Loyalty record not found' });
            }

            const canRedeem = loyalty.points >= points;
            res.json({ 
                canRedeem,
                currentPoints: loyalty.points,
                shortfall: canRedeem ? 0 : points - loyalty.points
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = loyaltyController;