const express = require('express');
const EventController = require('../controllers/EventController');

const router = express.Router();

// UC-03: Browse Events - List all events
// GET /api/events
// Optional query params: ?status=upcoming or ?visibility=campuswide
router.get('/', EventController.getEvents);

// UC-03: Browse Events - Get event details
// GET /api/events/:id
router.get('/:id', EventController.getEventById);

module.exports = router;
