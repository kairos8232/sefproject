const express = require('express');
const EventController = require('../controllers/EventController');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

// UC-03: Browse Events - List all events (protected route)
// GET /api/events
// Optional query params: ?status=upcoming or ?visibility=campuswide
router.get('/', AuthController.verifyToken, EventController.getEvents);

// UC-03: Browse Events - Get event details (protected route)
// GET /api/events/:id
router.get('/:id', AuthController.verifyToken, EventController.getEventById);

// Create new event (protected route)
// POST /api/events
router.post('/', AuthController.verifyToken, EventController.createEvent);

// Update event (protected route)
// PUT /api/events/:id
router.put('/:id', AuthController.verifyToken, EventController.updateEvent);

// Cancel event (protected route)
// PATCH /api/events/:id/cancel
router.patch('/:id/cancel', AuthController.verifyToken, EventController.cancelEvent);

// Delete event (protected route)
// DELETE /api/events/:id
router.delete('/:id', AuthController.verifyToken, EventController.deleteEvent);

// Toggle registration status (protected route)
// PUT /api/events/:id/registration-status
router.put('/:id/registration-status', AuthController.verifyToken, EventController.toggleRegistrationStatus);

// UC: Review Faculty Events - Get events in faculty's venues (faculty manager only)
// GET /api/events/faculty/events
router.get('/faculty/events', AuthController.verifyToken, EventController.getFacultyEvents);

// UC: Review Faculty Events - Get detailed event info (faculty manager only)
// GET /api/events/faculty/events/:id
router.get('/faculty/events/:id', AuthController.verifyToken, EventController.getFacultyEventById);

module.exports = router;
