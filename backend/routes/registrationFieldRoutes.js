const express = require('express');
const router = express.Router();
const RegistrationFieldController = require('../controllers/RegistrationFieldController');
const AuthController = require('../controllers/AuthController');

// Public route - Get custom fields for event registration (no auth required)
router.get('/events/:eventId/registration-fields/public', RegistrationFieldController.getPublicEventFields);

// Protected routes - Require authentication
// Get all custom fields for an event (organizer only)
router.get('/events/:eventId/registration-fields', AuthController.verifyToken, RegistrationFieldController.getEventFields);

// Create a new custom field (organizer only)
router.post('/events/:eventId/registration-fields', AuthController.verifyToken, RegistrationFieldController.createField);

// Update a custom field (organizer only)
router.put('/events/:eventId/registration-fields/:fieldId', AuthController.verifyToken, RegistrationFieldController.updateField);

// Delete a custom field (organizer only)
router.delete('/events/:eventId/registration-fields/:fieldId', AuthController.verifyToken, RegistrationFieldController.deleteField);

// Reorder custom fields (organizer only)
router.post('/events/:eventId/registration-fields/reorder', AuthController.verifyToken, RegistrationFieldController.reorderFields);

// Save participant responses to custom fields
router.post('/events/:eventId/registration-responses', AuthController.verifyToken, RegistrationFieldController.saveResponses);

// Get participant's own responses
router.get('/events/:eventId/registration-responses/my', AuthController.verifyToken, RegistrationFieldController.getMyResponses);

// Get all responses for an event (organizer only)
router.get('/events/:eventId/registration-responses', AuthController.verifyToken, RegistrationFieldController.getEventResponses);

module.exports = router;
