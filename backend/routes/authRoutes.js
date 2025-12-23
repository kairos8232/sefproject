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

// Protected route example (verify token)
router.get('/me', AuthController.verifyToken, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
