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

module.exports = router;
