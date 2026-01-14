import apiClient from './apiClient';

const invitationService = {
  // Get all invitations for an event
  getEventInvitations: async (eventId) => {
    try {
      const response = await apiClient.get(`/invitations/events/${eventId}/invitations`);
      return response.data.invitations || [];
    } catch (error) {
      throw error.response?.data?.error || 'Failed to get invitations';
    }
  },

  // Get current user's invitations
  getUserInvitations: async () => {
    try {
      const response = await apiClient.get('/invitations/my-invitations');
      return response.data.invitations || [];
    } catch (error) {
      throw error.response?.data?.error || 'Failed to get invitations';
    }
  },

  // Get users that can be invited
  getInvitableUsers: async (eventId) => {
    try {
      const response = await apiClient.get(`/invitations/events/${eventId}/invitable-users`);
      return response.data.users || [];
    } catch (error) {
      throw error.response?.data?.error || 'Failed to get users';
    }
  },

  // Send invitations
  inviteUsers: async (eventId, userIds) => {
    try {
      const response = await apiClient.post(`/invitations/events/${eventId}/invite`, {
        userIds
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to send invitations';
    }
  },

  // Respond to invitation
  respondToInvitation: async (invitationId, status) => {
    try {
      const response = await apiClient.put(
        `/invitations/invitations/${invitationId}/respond`,
        { status }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to respond to invitation';
    }
  },

  // Revoke invitation
  revokeInvitation: async (invitationId) => {
    try {
      const response = await apiClient.delete(
        `/invitations/invitations/${invitationId}`
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to revoke invitation';
    }
  },

  // Get invitation statistics
  getStatistics: async (eventId) => {
    try {
      const response = await apiClient.get(
        `/invitations/events/${eventId}/invitations/statistics`
      );
      return response.data.statistics || { total: 0, pending: 0, accepted: 0, declined: 0 };
    } catch (error) {
      throw error.response?.data?.error || 'Failed to get statistics';
    }
  }
};

export default invitationService;
