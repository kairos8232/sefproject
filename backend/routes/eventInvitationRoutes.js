const express = require('express');
const EventInvitationController = require('../controllers/EventInvitationController');
const { verifyToken } = require('../controllers/AuthController');

const router = express.Router();
const invitationController = new EventInvitationController();

// All routes require authentication
router.use(verifyToken);

// Get all invitations for an event (organizer/admin/faculty manager)
router.get('/events/:eventId/invitations', invitationController.getEventInvitations);

// Get statistics for event invitations
router.get('/events/:eventId/invitations/statistics', invitationController.getInvitationStatistics);

// Get users available to invite (organizer only)
router.get('/events/:eventId/invitable-users', invitationController.getInvitableUsers);

// Get current user's invitations
router.get('/my-invitations', invitationController.getUserInvitations);

// Send invitations to users
router.post('/events/:eventId/invite', invitationController.inviteUsers);

// Accept/decline invitation
router.put('/invitations/:invitationId/respond', invitationController.respondToInvitation);

// Revoke invitation (organizer/admin only)
router.delete('/invitations/:invitationId', invitationController.revokeInvitation);

module.exports = router;
