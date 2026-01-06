const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const EventFeedbackController = require('../controllers/EventFeedbackController');

// GET /api/event-feedbacks/eligible-events - Get events eligible for feedback
router.get('/eligible-events', AuthController.verifyToken, EventFeedbackController.getEligibleEvents);

// GET /api/event-feedbacks/my-feedbacks - Get all feedbacks submitted by current user
router.get('/my-feedbacks', AuthController.verifyToken, EventFeedbackController.getMyFeedbacks);

// GET /api/event-feedbacks/event/:eventId - Get all feedbacks for an event
router.get('/event/:eventId', AuthController.verifyToken, EventFeedbackController.getFeedbacksForEvent);

// GET /api/event-feedbacks/user-feedback/:eventId - Get user's feedback for a specific event
router.get('/user-feedback/:eventId', AuthController.verifyToken, EventFeedbackController.getUserFeedback);

// POST /api/event-feedbacks - Create new feedback
router.post('/', AuthController.verifyToken, EventFeedbackController.createFeedback);

// PUT /api/event-feedbacks/:id - Update feedback (within 24 hours)
router.put('/:id', AuthController.verifyToken, EventFeedbackController.updateFeedback);

module.exports = router;
