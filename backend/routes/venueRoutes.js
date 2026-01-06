const express = require('express');
const router = express.Router();
const VenueController = require('../controllers/VenueController');
const AuthController = require('../controllers/AuthController');

// Get all venues (filtered by faculty if faculty_manager)
router.get('/', AuthController.verifyToken, VenueController.getVenues);

// Get venue by ID
router.get('/:id', AuthController.verifyToken, VenueController.getVenueById);

module.exports = router;
