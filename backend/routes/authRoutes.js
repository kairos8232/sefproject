const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

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

// Refresh access token
router.post('/refresh', AuthController.refresh);

// Update profile (protected route)
router.put('/profile', AuthController.verifyToken, AuthController.updateProfile);

// Change password (protected route)
router.put('/change-password', AuthController.verifyToken, AuthController.changePassword);

// Protected route example (verify token)
router.get('/me', AuthController.verifyToken, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
