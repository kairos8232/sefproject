import apiClient from './apiClient';

const participationService = {
  // Get user's participation status for an event
  async getEventStatus(eventId) {
    try {
      console.log('[ParticipationService] Getting event status for:', eventId);
      const response = await apiClient.get(`/participation/event/${eventId}/status`);
      console.log('[ParticipationService] Event status response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[ParticipationService] Get status error:', error);
      throw error.response?.data?.error || 'Failed to get participation status';
    }
  },

  // Register for an event
  async register(eventId) {
    try {
      console.log('[ParticipationService] Registering for event:', eventId);
      const response = await apiClient.post(`/participation/event/${eventId}/register`);
      console.log('[ParticipationService] Registration successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('[ParticipationService] Registration failed:', error);
      console.error('[ParticipationService] Error response:', error.response);
      throw error.response?.data?.error || 'Failed to register for event';
    }
  },

  // Cancel participation
  async cancel(eventId) {
    try {
      const response = await apiClient.post(`/participation/event/${eventId}/cancel`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to cancel registration';
    }
  },

  // Get user's all participations
  async getMyParticipations() {
    try {
      const response = await apiClient.get('/participation/my');
      return response.data.participations;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to get participations';
    }
  },

  // Get event participants (for organizers/admins)
  async getEventParticipants(eventId) {
    try {
      const response = await apiClient.get(`/participation/event/${eventId}/participants`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to get event participants';
    }
  },

  // Get calendar data
  async getCalendarData(params = {}) {
    try {
      const response = await apiClient.get('/participation/calendar', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to get calendar data';
    }
  }
};

export default participationService;
