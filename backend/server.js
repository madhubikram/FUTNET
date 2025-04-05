require('./models/booking.model'); 
require('./models/loyalty.model');

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');

// Import routes
const playerTournamentRoutes = require('./routes/tournament.player.routes');
const playerCourtRoutes = require('./routes/playerCourt.routes');
const authRoutes = require('./routes/auth.routes');
const protectedRoutes = require('./routes/protected.routes');
const futsalRoutes = require('./routes/futsal.routes');
const courtRoutes = require('./routes/court.routes');
const tournamentRoutes = require(path.join(__dirname, 'routes', 'tournament.routes.js'));
const authMiddleware = require('./middleware/auth.middleware');
const validateLoyaltyTransaction = require('./middleware/loyalty.middleware');
const loyaltyRoutes = require('./routes/loyalty.routes');
const bookingRoutes = require('./routes/booking.routes');
const { updateTournamentStatuses } = require('./utils/tournamentStatus');



require('dotenv').config();

console.log('Starting server...');

// Create uploads directories if they don't exist
const uploadDir = path.join(__dirname, 'uploads');
const courtsUploadsDir = path.join(uploadDir, 'courts');
const tournamentsUploadsDir = path.join(uploadDir, 'tournaments');


if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(courtsUploadsDir)) {
    fs.mkdirSync(courtsUploadsDir, { recursive: true });
}
if (!fs.existsSync(tournamentsUploadsDir)) {
    fs.mkdirSync(tournamentsUploadsDir, { recursive: true });
}

const app = express();

// Security Middleware
app.use(cors({
    origin:  [
        'http://localhost:5173',
        'http://localhost:4173',
        'http://192.168.1.70:5173',
        'http://192.168.1.70:4173',
        'https://localhost:5173',
        'https://localhost:4173',
        'https://192.168.1.70:5173',
        'https://192.168.1.70:4173'
      ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With']
}));

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware in development only
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`, req.body);
        next();
    });
}

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/courts', courtRoutes);
app.use('/api/player/courts', playerCourtRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/futsal', futsalRoutes);
app.use('/api/player/tournaments', playerTournamentRoutes);
app.use('/api/tournaments', tournamentRoutes); 
app.use('/api/loyalty', authMiddleware);
app.use('/api/loyalty', validateLoyaltyTransaction);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api', protectedRoutes);


// Test Routes (development only)
if (process.env.NODE_ENV !== 'production') {
    app.get('/test', (req, res) => {
        res.json({ message: 'API working' });
    });

    app.get('/debug/routes', (req, res) => {
        const routes = [];
        app._router.stack.forEach(middleware => {
            if(middleware.route){ 
                routes.push(middleware.route.path);
            } else if(middleware.name === 'router'){ 
                middleware.handle.stack.forEach(handler => {
                    if(handler.route){
                        routes.push(handler.route.path);
                    }
                });
            }
        });
        res.json(routes);
    });

    app.get('/debug/loyalty', async (req, res) => {
        try {
            const Loyalty = require('./models/loyalty.model');
            const stats = await Loyalty.aggregate([
                {
                    $group: {
                        _id: null,
                        totalPoints: { $sum: '$points' },
                        averagePoints: { $avg: '$points' },
                        totalUsers: { $count: {} }
                    }
                }
            ]);
            res.json(stats[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.get('/debug/tournaments', async (req, res) => {
        try {
            const Tournament = require('./models/tournament.model');
            const tournaments = await Tournament.find().populate('futsalId');
            res.json({
                count: tournaments.length,
                tournaments
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.get('/debug/create-test-tournament', async (req, res) => {
        try {
            const Tournament = require('./models/tournament.model');
            const testTournament = new Tournament({
                name: 'Test Tournament',
                description: 'Test Description',
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000), // tomorrow
                startTime: '10:00',
                registrationDeadline: new Date(),
                maxTeams: 8,
                format: 'single',
                entryFee: 1000,
                prizePool: 10000,
                futsalId: '...your test futsal id...' // Add a valid futsal ID
            });
            await testTournament.save();
            res.json(testTournament);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    if (err.name === 'NotFoundError') {
        return res.status(404).json({
            message: 'Resource not found',
            error: err.message
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            message: 'Validation error',
            error: err.message
        });
    }

    // Add these loyalty-specific error handlers
    if (err.name === 'InsufficientPointsError') {
        return res.status(400).json({
            message: 'Insufficient loyalty points',
            error: err.message
        });
    }

    if (err.name === 'PointsRedemptionError') {
        return res.status(400).json({
            message: 'Points redemption failed',
            error: err.message
        });
    }

    res.status(err.status || 500).json({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

const PORT = process.env.PORT || 5000;

// MongoDB Connection and Server Start
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        
        // Start the server (only once)
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`Debug routes available at: http://localhost:${PORT}/debug/routes`);
            }
        });

        // Set up tournament status updates
        setInterval(updateTournamentStatuses, 5 * 60 * 1000);
        updateTournamentStatuses();
    })
    .catch((err) => console.error('MongoDB connection error:', err));

// Monitor pending admin registrations
mongoose.connection.on('connected', async () => {
    try {
        const User = require('./models/user.model');
        const Loyalty = require('./models/loyalty.model');
        const pendingAdmins = await User.find({
            role: 'futsalAdmin',
            verificationStatus: 'pending'
        });

        const usersWithoutLoyalty = await User.find({
            loyalty: { $exists: false },
            role: 'player'
        });

        for (const user of usersWithoutLoyalty) {
            const loyalty = new Loyalty({ user: user._id });
            await loyalty.save();
            await User.findByIdAndUpdate(user._id, { loyalty: loyalty._id });
        }
        console.log('Current pending admins:', pendingAdmins.length);
        console.log('Loyalty records initialized for new users');
    } catch (err) {
        console.error('Error in database initialization:', err);
    }
});