console.log("--- server.js started ---");

console.log("Requiring path...");
const path = require('path');
console.log("Requiring express...");
const express = require('express');
console.log("Requiring mongoose...");
const mongoose = require('mongoose');
console.log("Requiring cors...");
const cors = require('cors');
console.log("Requiring fs...");
const fs = require('fs');
console.log("Requiring node-cron...");
const cron = require('node-cron');

console.log("--- Before dotenv config ---");
require('dotenv').config();
console.log("--- After dotenv config ---");
console.log("MONGODB_URI check:", process.env.MONGODB_URI ? "Exists" : "MISSING!");
console.log("JWT_SECRET check:", process.env.JWT_SECRET ? "Exists" : "MISSING!");

console.log("--- Checking Essential Env Vars --- ");
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error("FATAL ERROR: MONGODB_URI and JWT_SECRET must be defined in .env");
    process.exit(1); // Exit if critical variables are missing
}
// Check Khalti variables (non-fatal, service will log error)
if (!process.env.KHALTI_SECRET_KEY || !process.env.KHALTI_API_URL || !process.env.FRONTEND_URL || !process.env.FRONTEND_CALLBACK_PATH) {
    console.warn("WARNING: Khalti environment variables are not fully set. Payment functionality will be affected.");
}
// Check VAPID variables (non-fatal, notification service handles it)
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn("WARNING: VAPID keys not set. Push notifications will be disabled.");
}
console.log("--- Env Var Checks Passed --- ");

console.log("Requiring booking.model...");
require('./models/booking.model');
console.log("Requiring loyalty.model...");
require('./models/loyalty.model');

console.log("--- Importing Routes --- ");
console.log("Requiring playerTournamentRoutes...");
const playerTournamentRoutes = require('./routes/tournament.player.routes');
console.log("Requiring playerCourtRoutes...");
const playerCourtRoutes = require('./routes/playerCourt.routes');
console.log("Requiring authRoutes...");
const authRoutes = require('./routes/auth.routes');
console.log("Requiring protectedRoutes...");
const protectedRoutes = require('./routes/protected.routes');
console.log("Requiring futsalRoutes...");
const futsalRoutes = require('./routes/futsal.routes');
console.log("Requiring courtRoutes...");
const courtRoutes = require('./routes/court.routes');
console.log("Requiring tournamentRoutes...");
const tournamentRoutes = require(path.join(__dirname, 'routes', 'tournament.routes.js'));
console.log("Requiring authMiddleware...");
const authMiddleware = require('./middleware/auth.middleware');
console.log("Requiring loyaltyMiddleware...");
const validateLoyaltyTransaction = require('./middleware/loyalty.middleware');
console.log("Requiring loyaltyRoutes...");
const loyaltyRoutes = require('./routes/loyalty.routes');
console.log("Requiring bookingRoutes...");
const bookingRoutes = require('./routes/booking.routes');
console.log("Requiring notificationRoutes...");
const notificationRoutes = require('./routes/notification.routes.js');
console.log("Requiring tournamentStatus util...");
const { updateTournamentStatuses } = require('./utils/tournamentStatus');
console.log("Requiring paymentRoutes...");
const paymentRoutes = require('./routes/payment.routes');
console.log("Requiring dashboardRoutes...");
const dashboardRoutes = require('./routes/dashboard.routes');
console.log("--- Routes Imported --- ");

console.log("--- Importing Services/Models for Cron --- ");
console.log("Requiring notification.service...");
const { createNotification } = require('./utils/notification.service');
console.log("Requiring booking.model (again?)... Check if needed"); // Note: Already required above
const Booking = require('./models/booking.model');
console.log("Requiring tournament.model...");
const Tournament = require('./models/tournament.model');
console.log("Requiring user.model...");
const User = require('./models/user.model');
console.log("Requiring notification.model...");
const Notification = require('./models/notification.model');
console.log("--- Cron Services/Models Imported --- ");

console.log("Requiring booking.service util...");
const { sendBookingReminderIfNotSent } = require('./utils/booking.service');

console.log('--- Starting server setup ---');

console.log('Creating uploads directories...');
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
console.log('Uploads directories ensured.');

console.log('Creating express app...');
const app = express();
console.log('Express app created.');

console.log('Applying CORS middleware...');
// --- CORS Configuration ---
// Define allowed origins based on environment
const developmentOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://192.168.1.70:5173', // Example local IP
    'http://192.168.1.70:4173',
    'https://localhost:5173',   // If using HTTPS locally
    'https://localhost:4173',
    'https://192.168.1.70:5173',
    'https://192.168.1.70:4173'
];

// Read allowed origins from environment variable for production
// Example: ALLOWED_ORIGINS=https://your-frontend.azurewebsites.net,https://another-domain.com
const productionOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean); // Split comma-separated string and remove empty entries

const allowedOrigins = process.env.NODE_ENV === 'production' ? productionOrigins : developmentOrigins;

if (process.env.NODE_ENV === 'production' && productionOrigins.length === 0) {
    console.warn('WARNING: NODE_ENV is production, but ALLOWED_ORIGINS environment variable is not set or empty. CORS might block your frontend.');
}

console.log('[CORS] Allowed Origins:', allowedOrigins);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check if the origin is in the allowed list
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true); // Origin is allowed
        } else {
            console.warn(`[CORS] Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS')); // Origin is not allowed
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With']
};

app.use(cors(corsOptions));
console.log('CORS middleware applied.');

console.log('Applying body parser middleware...');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('Body parser middleware applied.');

// Debug middleware in development only
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`, req.body);
        next();
    });
}

console.log('Applying static file serving...');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('Static file serving applied.');

console.log('Applying API routes...');
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
app.use('/api/notifications', notificationRoutes);
app.use('/api', protectedRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
console.log('API routes applied.');

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

    // --- Add Debug Endpoint for Booking Reminder ---
    app.post('/api/debug/send-booking-reminder/:bookingId', async (req, res) => {
        const { bookingId } = req.params;
        console.log(`[Debug Endpoint] Received request to send reminder for booking: ${bookingId}`);
        if (!bookingId) {
            return res.status(400).json({ success: false, message: 'Missing bookingId parameter.' });
        }
        try {
            const result = await sendBookingReminderIfNotSent(bookingId);
            console.log(`[Debug Endpoint] Result from sendBookingReminderIfNotSent for ${bookingId}:`, result);
            // Send appropriate status based on the service function's success
            if (result.success) {
                res.status(200).json(result);
            } else {
                 // Use 404 if booking not found, otherwise 500 for other errors
                const statusCode = result.message === 'Booking not found.' ? 404 : 500;
                res.status(statusCode).json(result);
            }
        } catch (error) {
            console.error(`[Debug Endpoint] Unexpected error sending reminder for ${bookingId}:`, error);
            res.status(500).json({ success: false, message: `Unexpected server error: ${error.message}`, notificationSent: false });
        }
    });
    // --- End Debug Endpoint ---
}

console.log('Applying global error handler...');
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
console.log('Global error handler applied.');

const PORT = process.env.PORT || 5000;
console.log(`PORT variable set to: ${PORT}`);

console.log('--- Attempting MongoDB Connection ---');
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('--- MongoDB Connection Successful ---');
        
        console.log(`--- Starting server listening on port ${PORT} ---`);
        app.listen(PORT, () => {
            console.log(`****** Server running on port ${PORT} ******`); // Make this stand out
            if (process.env.NODE_ENV !== 'production') {
                console.log(`Debug routes available at: http://localhost:${PORT}/debug/routes`);
            }
        });

        console.log('--- Setting up Cron Jobs ---');
        // --- Cron Jobs Setup --- 
        console.log('[Cron] Setting up scheduled tasks...');

        // Schedule 1: Check for booking reminders (e.g., every 15 minutes)
        cron.schedule('*/15 * * * *', async () => {
            console.log('[Cron - Booking Reminder] Running job...');
            const now = new Date();
            const reminderWindowStart = new Date(now.getTime() + 60 * 60 * 1000); // 60 mins from now
            const reminderWindowEnd = new Date(now.getTime() + 75 * 60 * 1000); // 75 mins from now

            try {
                // Find confirmed bookings potentially needing reminders
                const upcomingBookings = await Booking.find({
                    status: 'confirmed',
                    date: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }, 
                    reminderSent: { $ne: true }
                    // Don't populate here, the service function will handle it if needed
                }).select('_id date startTime'); // Only select necessary fields for time check

                console.log(`[Cron - Booking Reminder] Found ${upcomingBookings.length} potential bookings to check.`);

                for (const booking of upcomingBookings) {
                    // Combine booking date (UTC midnight) with startTime string (HH:MM)
                    const [hours, minutes] = booking.startTime.split(':').map(Number);
                    const bookingStartDateTime = new Date(Date.UTC(
                        booking.date.getUTCFullYear(),
                        booking.date.getUTCMonth(),
                        booking.date.getUTCDate(),
                        hours,
                        minutes
                    ));

                    // Check if the booking start time falls within the reminder window
                    if (bookingStartDateTime >= reminderWindowStart && bookingStartDateTime < reminderWindowEnd) {
                        console.log(`[Cron - Booking Reminder] Booking ${booking._id} is within window. Calling sendBookingReminderIfNotSent...`);
                        // Call the refactored service function - no need to check user/status again here
                        const result = await sendBookingReminderIfNotSent(booking._id);
                        // Log the result from the service function
                        console.log(`[Cron - Booking Reminder] Result for booking ${booking._id}: ${result.message}`); 
                    } 
                    // Optional: Log if a booking was found but outside the window for debugging
                    // else {
                    //     console.log(`[Cron - Booking Reminder] Booking ${booking._id} found but start time ${bookingStartDateTime.toISOString()} is outside window [${reminderWindowStart.toISOString()}, ${reminderWindowEnd.toISOString()}).`);
                    // }
                }
            } catch (error) {
                console.error('[Cron - Booking Reminder] Error processing booking reminders:', error);
            }
        });

        // Schedule 2: Check for tournament fixture reminders (e.g., every hour)
        cron.schedule('0 * * * *', async () => {
            console.log('[Cron - Tournament Reminder] Running job...');
            const now = new Date();
            const reminderWindowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours from now
            const reminderWindowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);   // 25 hours from now
            
            try {
                 const upcomingTournaments = await Tournament.find({
                    status: 'Upcoming', // Only remind for upcoming tournaments
                    // Combine startDate and startTime for comparison
                 });

                 for (const tournament of upcomingTournaments) {
                     const startTimeParts = tournament.startTime.split(':');
                     const tournamentStartDateTime = new Date(tournament.startDate);
                     tournamentStartDateTime.setUTCHours(parseInt(startTimeParts[0], 10), parseInt(startTimeParts[1], 10), 0, 0);

                     if (tournamentStartDateTime >= reminderWindowStart && tournamentStartDateTime < reminderWindowEnd) {
                         console.log(`[Cron - Tournament Reminder] Found tournament ${tournament.name} starting soon at ${tournamentStartDateTime.toISOString()}`);
                         
                         // Find the admin for this tournament
                         const futsalAdmin = await User.findOne({ futsal: tournament.futsalId, role: 'futsalAdmin' });
                         if (futsalAdmin) {
                             // Check if reminder already sent
                             const existingReminder = await Notification.findOne({ 
                                 user: futsalAdmin._id, 
                                 type: 'tournament_fixture_reminder',
                                 message: { $regex: `Tournament ${tournament.name} is starting soon` } 
                             });

                             if (!existingReminder) {
                                 console.log(`[Cron - Tournament Reminder] Sending fixture reminder for ${tournament.name} to admin ${futsalAdmin._id}`);
                                 const title = 'Tournament Reminder';
                                 const message = `Tournament ${tournament.name} is starting soon. Please finalize and allocate time for fixtures.`;
                                 await createNotification(
                                     futsalAdmin._id,
                                     title,
                                     message,
                                     'tournament_fixture_reminder',
                                     `/admin-tournaments/${tournament._id}` // Link to specific tournament admin page
                                 );
                             } else {
                                console.log(`[Cron - Tournament Reminder] Fixture reminder already sent for ${tournament.name}`);
                             }
                         } else {
                             console.warn(`[Cron - Tournament Reminder] No admin found for futsal ${tournament.futsalId}`);
                         }
                     }
                 }

            } catch (error) {
                 console.error('[Cron - Tournament Reminder] Error processing reminders:', error);
            }
        });

        // Schedule 3: Update tournament statuses (e.g., every 5 minutes)
        cron.schedule('*/5 * * * *', async () => {
             console.log('[Cron - Status Update] Running automatic status update...');
             await updateTournamentStatuses(); 
        });

        // Initial status update on server start
        console.log('[Init] Performing initial tournament status update...');
        updateTournamentStatuses();

        console.log('--- Cron Jobs Setup Complete ---');

    })
    .catch((err) => {
        console.error('###### MongoDB connection error ######:', err);
        process.exit(1); // Exit if DB connection fails
    });

console.log('--- End of main script execution (before async ops complete) ---');

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