const express = require('express');
const router = express.Router();
const VenueController = require('../controllers/VenueController');
const AuthController = require('../controllers/AuthController');

// Admin management routes
router.get('/admin/all', AuthController.verifyToken, VenueController.getAllVenues);
router.post('/admin', AuthController.verifyToken, VenueController.createVenue);
router.put('/admin/:id', AuthController.verifyToken, VenueController.updateVenue);
router.put('/admin/:id/status', AuthController.verifyToken, VenueController.updateVenueStatus);

// Public/general routes (filtered by faculty if faculty_staff)
router.get('/', AuthController.verifyToken, VenueController.getVenues);
router.get('/:id', AuthController.verifyToken, VenueController.getVenueById);

module.exports = router;
