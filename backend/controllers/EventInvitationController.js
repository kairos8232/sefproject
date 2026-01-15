const EventInvitation = require('../models/EventInvitation');
const Event = require('../models/Event');
const User = require('../models/User');

class EventInvitationController {
  // UC-XX: Get all invitations for an event
  getEventInvitations = async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Verify event exists
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Only event organizer, admins, and faculty staff can view invitations
      if (
        event.organizer_id !== userId &&
        userRole !== 'administrator' &&
        userRole !== 'faculty_staff'
      ) {
        return res.status(403).json({ error: 'Not authorized to view invitations' });
      }

      const invitations = await EventInvitation.getByEventId(eventId);
      const statistics = await EventInvitation.getStatistics(eventId);

      res.json({
        success: true,
        invitations,
        statistics
      });
    } catch (error) {
      console.error('Get event invitations error:', error);
      res.status(500).json({ error: 'Failed to get invitations' });
    }
  };

  // UC-XX: Get invitations for current user
  getUserInvitations = async (req, res) => {
    try {
      const userId = req.user.userId;

      const invitations = await EventInvitation.getByUserId(userId);

      res.json({
        success: true,
        invitations
      });
    } catch (error) {
      console.error('Get user invitations error:', error);
      res.status(500).json({ error: 'Failed to get invitations' });
    }
  };

  // UC-XX: Invite users to an event
  inviteUsers = async (req, res) => {
    try {
      const { eventId } = req.params;
      const { userIds } = req.body;
      const organizerId = req.user.userId;

      // Validate input
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'userIds must be a non-empty array' });
      }

      // Verify event exists and is invite-only
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.visibility !== 'inviteonly') {
        return res.status(400).json({ 
          error: 'Event must be invite-only to send invitations' 
        });
      }

      // Only event organizer can invite
      if (event.organizer_id !== organizerId) {
        return res.status(403).json({ error: 'Not authorized to invite users' });
      }

      // Verify all users exist
      const users = await Promise.all(
        userIds.map(userId => User.findById(userId))
      );

      const invalidUsers = users.filter((user, index) => 
        !user && console.log(`User ${userIds[index]} not found`)
      );

      if (invalidUsers.some(u => !u)) {
        return res.status(400).json({ error: 'One or more users not found' });
      }

      // Create invitations (batch)
      const invitationData = userIds.map(userId => ({
        event_id: eventId,
        user_id: userId,
        invited_by: organizerId
      }));

      const createdInvitations = await EventInvitation.createBatch(invitationData);

      res.json({
        success: true,
        message: `${createdInvitations.length} invitations sent`,
        invitations: createdInvitations
      });
    } catch (error) {
      console.error('Invite users error:', error);
      res.status(500).json({ error: 'Failed to send invitations' });
    }
  };

  // UC-XX: Respond to invitation (accept/decline)
  respondToInvitation = async (req, res) => {
    try {
      const { invitationId } = req.params;
      const { status } = req.body;
      const userId = req.user.userId;

      // Validate status
      const validStatuses = ['accepted', 'declined'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be accepted or declined' });
      }

      // Get invitation
      const invitation = await EventInvitation.getById(invitationId);
      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      // Only invited user can respond
      if (invitation.user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to respond to this invitation' });
      }

      // Update status
      const updatedInvitation = await EventInvitation.updateStatus(invitationId, status);

      res.json({
        success: true,
        message: `Invitation ${status}`,
        invitation: updatedInvitation
      });
    } catch (error) {
      console.error('Respond to invitation error:', error);
      res.status(500).json({ error: 'Failed to respond to invitation' });
    }
  };

  // UC-XX: Revoke invitation (organizer only)
  revokeInvitation = async (req, res) => {
    try {
      const { invitationId } = req.params;
      const organizerId = req.user.userId;
      const userRole = req.user.role;

      // Get invitation
      const invitation = await EventInvitation.getById(invitationId);
      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      // Get event to verify organizer
      const event = await Event.getById(invitation.event_id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Only event organizer and admins can revoke
      if (event.organizer_id !== organizerId && userRole !== 'administrator') {
        return res.status(403).json({ error: 'Not authorized to revoke invitations' });
      }

      // Delete invitation
      await EventInvitation.delete(invitationId);

      res.json({
        success: true,
        message: 'Invitation revoked'
      });
    } catch (error) {
      console.error('Revoke invitation error:', error);
      res.status(500).json({ error: 'Failed to revoke invitation' });
    }
  };

  // UC-XX: Get invitation statistics
  getInvitationStatistics = async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Verify event exists
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Only event organizer, admins, and faculty staff can view stats
      if (
        event.organizer_id !== userId &&
        userRole !== 'administrator' &&
        userRole !== 'faculty_staff'
      ) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const statistics = await EventInvitation.getStatistics(eventId);

      res.json({
        success: true,
        statistics
      });
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({ error: 'Failed to get statistics' });
    }
  };

  // UC-XX: Get all users that can be invited (for dropdown)
  getInvitableUsers = async (req, res) => {
    try {
      const { eventId } = req.params;
      const organizerId = req.user.userId;

      // Verify event exists
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Only event organizer can get this list
      if (event.organizer_id !== organizerId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Get all users (excluding organizer, administrators, and inactive users)
      const allUsers = await User.getAll();
      const filteredUsers = allUsers.filter(user => 
        user.id !== organizerId && 
        user.role !== 'administrator' &&
        user.status === 'active'
      );

      // Get already invited users
      const existingInvitations = await EventInvitation.getByEventId(eventId);
      const invitedUserIds = new Set(existingInvitations.map(inv => inv.user_id));

      // Filter out already invited users
      const availableUsers = filteredUsers.filter(
        user => !invitedUserIds.has(user.id)
      );

      res.json({
        success: true,
        users: availableUsers
      });
    } catch (error) {
      console.error('Get invitable users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  };
}

module.exports = EventInvitationController;
