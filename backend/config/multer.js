// config/multer.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// // Ensure uploads directory exists
// const ensureUploadsDir = (subDir = '') => {
//     const dirPath = path.join(__dirname, '..', 'uploads', subDir);
//     if (!fs.existsSync(dirPath)) {
//         fs.mkdirSync(dirPath, { recursive: true });
//     }
//     return dirPath;
// };

// Storage for futsal documents (pan/vat)
// const futsalStorage = multer.diskStorage({ // <<< REMOVE THIS BLOCK
//     destination: function (req, file, cb) {
//         cb(null, ensureUploadsDir()); // Save directly in uploads for futsal documents
//     },
//     filename: function (req, file, cb) {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, 'futsal-' + uniqueSuffix + path.extname(file.originalname));
//     }
// });
const futsalStorage = multer.memoryStorage(); // <<< ADD THIS

const futsalFileFilter = (req, file, cb) => {
    // Allow images and potentially PDFs if needed for legal docs elsewhere
    const allowedTypes = /jpeg|jpg|png|pdf/;
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
    fileFilter: futsalFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Example: 10MB limit
    }
});

// Storage for tournament banners
// const tournamentStorage = multer.diskStorage({ // <<< REMOVE THIS BLOCK
//     destination: function (req, file, cb) {
//         cb(null, ensureUploadsDir('tournaments')); // Save in uploads/tournaments
//     },
//     filename: function (req, file, cb) {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
//     }
// });
const tournamentStorage = multer.memoryStorage(); // <<< ADD THIS

const tournamentFileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images (jpg, png, gif) are allowed.'), false);
    }
};

// Export specific upload configurations if needed elsewhere
const tournamentUpload = multer({ 
    storage: tournamentStorage,
    fileFilter: tournamentFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    } 
});

module.exports = {
    upload, // General purpose using .any() or specific field setup
    tournamentUpload // Example specific upload
    // Add other specific upload instances if required
};