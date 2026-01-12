import apiClient from './apiClient';

const eventService = {
  // Get all events (upcoming and ongoing)
  getAllEvents: async () => {
    try {
      const response = await apiClient.get('/events');
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch events';
    }
  },

  // Get event by ID
  getEventById: async (id) => {
    try {
      const response = await apiClient.get(`/events/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch event details';
    }
  },

  // Get events by status
  getEventsByStatus: async (status) => {
    try {
      const response = await apiClient.get(`/events?status=${status}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch events';
    }
  },

  // Get events by visibility
  getEventsByVisibility: async (visibility) => {
    try {
      const response = await apiClient.get(`/events?visibility=${visibility}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch events';
    }
  },

  // Create event
  createEvent: async (eventData) => {
    try {
      const response = await apiClient.post('/events', eventData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to create event';
    }
  },

  // Cancel event (update status to cancelled)
  cancelEvent: async (id) => {
    try {
      const response = await apiClient.patch(`/events/${id}/cancel`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to cancel event';
    }
  },

  // Delete event
  deleteEvent: async (id) => {
    try {
      const response = await apiClient.delete(`/events/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to delete event';
    }
  },
  updateEvent: async (eventId, eventData) => {
    try {
      const response = await apiClient.put(`/events/${eventId}`, eventData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to update event';
    }
  },

  // Toggle registration status (open/close)
  toggleRegistrationStatus: async (eventId) => {
    try {
      const response = await apiClient.put(`/events/${eventId}/registration-status`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to toggle registration status';
    }
  },
};

export default eventService;
