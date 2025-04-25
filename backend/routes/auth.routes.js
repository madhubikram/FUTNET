const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 
console.log('Loading auth routes...');
const { register, login } = require('../controllers/auth.controller');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created uploads directory:', uploadDir);
}

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only .png, .jpg, .jpeg and .pdf files are allowed!'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
}).array('documents', 5);

// Wrap register route to handle multer errors
router.post('/register', (req, res) => {
    upload(req, res, async function(err) {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({
                message: 'File upload error',
                error: err.message
            });
        } else if (err) {
            console.error('Unknown upload error:', err);
            return res.status(500).json({
                message: 'Error uploading file',
                error: err.message
            });
        }

        try {
            await register(req, res);
        } catch (error) {
            console.error('Registration error:', error);
            return res.status(500).json({
                message: 'Registration failed',
                error: error.message
            });
        }
    });
});

router.post('/login', login);

console.log('Auth routes loaded');

module.exports = router;