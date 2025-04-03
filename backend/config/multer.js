// config/multer.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define storage for futsal images specifically
const futsalStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/futsals'); // Specific folder
         // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('Created futsal uploads directory:', uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'futsal-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Allow images and potentially PDFs if needed for legal docs elsewhere
    const allowedTypes = /jpeg|jpg|png|pdf|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images (jpg, png, gif) and PDF are allowed.'), false);
    }
};

// General purpose upload using .any() - more flexible for FormData with mixed fields/files
const upload = multer({
    storage: futsalStorage, // Use specific storage for this route
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Example: 10MB limit
    }
});

// Export specific upload configurations if needed elsewhere
const tournamentStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/tournaments');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('Created tournament uploads directory:', uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'tournament-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const tournamentUpload = multer({ 
    storage: tournamentStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    } 
});

module.exports = {
    upload, // General purpose using .any() or specific field setup
    tournamentUpload // Example specific upload
    // Add other specific upload instances if required
};