const express = require('express');
const router = express.Router();
const ParticipationController = require('../controllers/ParticipationController');
const AuthController = require('../controllers/AuthController');

// All routes require authentication
router.use(AuthController.verifyToken);

// Get user's all participations
router.get('/my', ParticipationController.getMyParticipations);

// Get participation status for a specific event
router.get('/event/:eventId/status', ParticipationController.getStatus);

// Register for an event
router.post('/event/:eventId/register', ParticipationController.register);

// Cancel participation
router.post('/event/:eventId/cancel', ParticipationController.cancel);

// Get event participants (organizers/admins only)
router.get('/event/:eventId/participants', ParticipationController.getEventParticipants);

// Record attendance for an event (organizers only)
router.post('/event/:eventId/record-attendance', ParticipationController.recordAttendance);

module.exports = router;
