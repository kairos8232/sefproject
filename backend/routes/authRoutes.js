const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

// Rate limiter for refresh endpoint - max 10 requests per 15 minutes per IP
const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 refresh requests per windowMs
  message: {
    error: 'Too many refresh attempts. Please try again later.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false
  // Using default key generator (req.ip) which handles IPv6 correctly
});

// Login route - corresponds to UI -> C: login(email, password)
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  AuthController.login
);

// Logout route
router.post('/logout', AuthController.logout);

// Refresh access token (with rate limiting)
router.post('/refresh', refreshRateLimiter, AuthController.refresh);

// Update profile (protected route)
router.put('/profile', AuthController.verifyToken, AuthController.updateProfile);

// Change password (protected route)
router.put('/change-password', AuthController.verifyToken, AuthController.changePassword);

// Get current user profile with full details including faculty
router.get('/me', AuthController.verifyToken, AuthController.getCurrentUserProfile);

module.exports = router;
