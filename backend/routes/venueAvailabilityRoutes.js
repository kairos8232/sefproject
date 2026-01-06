const express = require('express');
const router = express.Router();
const VenueAvailabilityController = require('../controllers/VenueAvailabilityController');
const AuthController = require('../controllers/AuthController');

// Get all blocked time slots for faculty's venues
router.get('/', AuthController.verifyToken, VenueAvailabilityController.getBlockedSlots);

// Create a new blocked time slot
router.post('/', AuthController.verifyToken, VenueAvailabilityController.createBlock);

// Update a blocked time slot
router.put('/:id', AuthController.verifyToken, VenueAvailabilityController.updateBlock);

// Delete a blocked time slot
router.delete('/:id', AuthController.verifyToken, VenueAvailabilityController.deleteBlock);

module.exports = router;
