const Booking = require('../models/booking.model');
const User = require('../models/user.model');
const Court = require('../models/court.model');
const Futsal = require('../models/futsal.model');
const Payment = require('../models/payment.model');
const TournamentRegistration = require('../models/tournament.registration.model');
const Tournament = require('../models/tournament.model');
const { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, isFuture, isPast, isEqual } = require('date-fns');

const getCounts = async (req, res) => {
    try {
        // Ensure the user is a futsalAdmin and has a futsal associated
        if (req.user.role !== 'futsalAdmin' || !req.user.futsal) {
             return res.status(403).json({ message: "Access denied or futsal not associated with admin." });
        }
        const futsalId = req.user.futsal._id; // Get futsal ID from authenticated user

        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        // Find courts belonging to this futsal admin
        const futsalCourts = await Court.find({ futsalId: futsalId }).select('_id');
        const futsalCourtIds = futsalCourts.map(court => court._id);

        // Get counts for futsal-specific tournaments
        const now = new Date();
        const [upcomingTournamentsCount, activeTournamentsCount] = await Promise.all([
             Tournament.countDocuments({
                futsalId: futsalId,
                status: { $nin: ['Cancelled', 'Completed'] }, // Exclude finished/cancelled
                startDate: { $gt: now } // Starts after now
            }),
             Tournament.countDocuments({
                futsalId: futsalId,
                status: { $nin: ['Cancelled', 'Completed'] }, // Exclude finished/cancelled
                startDate: { $lte: now }, // Starts now or in the past
                endDate: { $gte: todayStart } // Ends today or in the future
            })
        ]);

        const [
            totalBookingsToday,
            totalRevenueToday,
            upcomingBookingsCount,
            pendingVerifications,
            activeCourts,
            inactiveCourts,
        ] = await Promise.all([
            // Count bookings for THIS futsal today
            Booking.countDocuments({
                 court: { $in: futsalCourtIds },
                 createdAt: { $gte: todayStart, $lte: todayEnd },
                 status: { $ne: 'cancelled' }
            }),
            // Aggregate revenue for THIS futsal today
            Booking.aggregate([
                { $match: { court: { $in: futsalCourtIds }, createdAt: { $gte: todayStart, $lte: todayEnd }, paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$price' } } }
            ]),
             // Count confirmed bookings for THIS futsal from today onwards
            Booking.countDocuments({
                court: { $in: futsalCourtIds },
                status: 'confirmed',
                date: { $gte: todayStart } // Date is today or in the future
            }),
            User.countDocuments({ role: 'futsalAdmin', verificationStatus: 'pending' }), // System-wide, maybe remove?
            Court.countDocuments({ futsalId: futsalId, status: 'Active' }),
            Court.countDocuments({ futsalId: futsalId, status: 'Inactive' }),
        ]);

        res.json({
            totalBookingsToday: totalBookingsToday || 0,
            totalRevenueToday: totalRevenueToday[0]?.total || 0,
            upcomingBookingsCount: upcomingBookingsCount || 0,
            pendingFutsalVerifications: pendingVerifications || 0, // Consider removing
            totalCourtsActive: activeCourts || 0,
            totalCourtsInactive: inactiveCourts || 0,
            upcomingTournamentsCount: upcomingTournamentsCount || 0, // Refined count
            activeTournamentsCount: activeTournamentsCount || 0,   // New KPI
        });

    } catch (error) {
        console.error("Error fetching dashboard counts:", error);
        res.status(500).json({ message: "Failed to fetch dashboard counts" });
    }
};

const getBookingTrends = async (req, res) => {
    try {
         if (req.user.role !== 'futsalAdmin' || !req.user.futsal) {
             return res.status(403).json({ message: "Access denied or futsal not associated with admin." });
        }
        const futsalId = req.user.futsal._id;
        const futsalCourts = await Court.find({ futsalId: futsalId }).select('_id');
        const futsalCourtIds = futsalCourts.map(court => court._id);

        const trendData = [];
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const start = startOfDay(date);
            const end = endOfDay(date);

            const count = await Booking.countDocuments({
                court: { $in: futsalCourtIds }, // Filter by futsal courts
                createdAt: { $gte: start, $lte: end },
                status: { $ne: 'cancelled' }
            });
            trendData.push({ date: start.toISOString().split('T')[0], count });
        }
        res.json(trendData);
    } catch (error) {
         console.error("Error fetching booking trends:", error);
        res.status(500).json({ message: "Failed to fetch booking trends" });
    }
};

const getRevenueTrends = async (req, res) => {
    try {
         if (req.user.role !== 'futsalAdmin' || !req.user.futsal) {
             return res.status(403).json({ message: "Access denied or futsal not associated with admin." });
        }
        const futsalId = req.user.futsal._id;
        const futsalCourts = await Court.find({ futsalId: futsalId }).select('_id');
        const futsalCourtIds = futsalCourts.map(court => court._id);

        const trendData = [];
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const start = startOfDay(date);
            const end = endOfDay(date);

            const result = await Booking.aggregate([
                {
                    $match: {
                        court: { $in: futsalCourtIds }, // Filter by futsal courts
                        createdAt: { $gte: start, $lte: end },
                        paymentStatus: 'paid'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$price' }
                    }
                }
            ]);

            trendData.push({
                date: start.toISOString().split('T')[0],
                revenue: result[0]?.total || 0
            });
        }
        res.json(trendData);
    } catch (error) {
        console.error("Error fetching revenue trends:", error);
        res.status(500).json({ message: "Failed to fetch revenue trends" });
    }
};

const getBookingStatusDistribution = async (req, res) => {
    try {
        if (req.user.role !== 'futsalAdmin' || !req.user.futsal) {
             return res.status(403).json({ message: "Access denied or futsal not associated with admin." });
        }
        const futsalId = req.user.futsal._id;
        const futsalCourts = await Court.find({ futsalId: futsalId }).select('_id');
        const futsalCourtIds = futsalCourts.map(court => court._id);

        const lookbackDays = 30;
        const startDate = startOfDay(subDays(new Date(), lookbackDays -1));

        const distribution = await Booking.aggregate([
            {
                $match: {
                    court: { $in: futsalCourtIds }, // Filter by futsal courts
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    status: '$_id',
                    count: 1
                }
            }
        ]);

        res.json(distribution);
    } catch (error) {
        console.error("Error fetching booking status distribution:", error);
        res.status(500).json({ message: "Failed to fetch booking status distribution" });
    }
};

const getPaymentMethodsDistribution = async (req, res) => {
   try {
        if (req.user.role !== 'futsalAdmin' || !req.user.futsal) {
             return res.status(403).json({ message: "Access denied or futsal not associated with admin." });
        }
        const futsalId = req.user.futsal._id;
        const futsalCourts = await Court.find({ futsalId: futsalId }).select('_id');
        const futsalCourtIds = futsalCourts.map(court => court._id);

        const lookbackDays = 30;
        const startDate = startOfDay(subDays(new Date(), lookbackDays - 1));

        const distribution = await Booking.aggregate([
            {
                $match: {
                    court: { $in: futsalCourtIds }, // Filter by futsal courts
                    createdAt: { $gte: startDate },
                    paymentStatus: 'paid',
                    'paymentDetails.method': { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$paymentDetails.method',
                    count: { $sum: 1 }
                }
            },
            {
                 $project: {
                    _id: 0,
                    method: '$_id',
                    count: 1
                }
            }
        ]);
        res.json(distribution);
    } catch (error) {
        console.error("Error fetching payment methods distribution:", error);
        res.status(500).json({ message: "Failed to fetch payment methods distribution" });
    }
};

// New function to get upcoming tournament list for this futsal
const getUpcomingTournamentsList = async (req, res) => {
    try {
        if (req.user.role !== 'futsalAdmin' || !req.user.futsal) {
             return res.status(403).json({ message: "Access denied or futsal not associated with admin." });
        }
        const futsalId = req.user.futsal._id;

        const now = new Date();
        const upcomingTournaments = await Tournament.find({
            futsalId: futsalId,
            status: { $nin: ['Cancelled', 'Completed'] },
            startDate: { $gt: now }
        })
        .sort({ startDate: 1 }) // Sort by nearest start date
        .limit(5) // Limit to the next 5
        .select('name startDate registeredTeams maxTeams'); // Select only needed fields

        res.json(upcomingTournaments);

    } catch (error) {
        console.error("Error fetching upcoming tournaments list:", error);
        res.status(500).json({ message: "Failed to fetch upcoming tournaments list" });
    }
};

module.exports = {
    getCounts,
    getBookingTrends,
    getRevenueTrends,
    getBookingStatusDistribution,
    getPaymentMethodsDistribution,
    getUpcomingTournamentsList
}; 