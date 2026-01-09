import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: `${API_URL}/participation`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const participationService = {
  // Get user's participation status for an event
  async getEventStatus(eventId) {
    try {
      const response = await api.get(`/event/${eventId}/status`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to get participation status';
    }
  },

  // Register for an event
  async register(eventId) {
    try {
      console.log('[ParticipationService] Registering for event:', eventId);
      const response = await api.post(`/event/${eventId}/register`);
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
      const response = await api.post(`/event/${eventId}/cancel`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to cancel registration';
    }
  },

  // Get user's all participations
  async getMyParticipations() {
    try {
      const response = await api.get('/my');
      return response.data.participations;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to get participations';
    }
  },

  // Get event participants (for organizers/admins)
  async getEventParticipants(eventId) {
    try {
      const response = await api.get(`/event/${eventId}/participants`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to get event participants';
    }
  }
};

export default participationService;
