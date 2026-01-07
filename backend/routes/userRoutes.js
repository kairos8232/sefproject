const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const AuthController = require('../controllers/AuthController');

// All routes require authentication
router.get('/', AuthController.verifyToken, UserController.getAllUsers);
router.post('/', AuthController.verifyToken, UserController.createUser);
router.put('/:id', AuthController.verifyToken, UserController.updateUser);
router.put('/:id/status', AuthController.verifyToken, UserController.updateUserStatus);
router.put('/:id/role', AuthController.verifyToken, UserController.updateUserRole);
router.put('/:id/password', AuthController.verifyToken, UserController.resetPassword);

module.exports = router;
