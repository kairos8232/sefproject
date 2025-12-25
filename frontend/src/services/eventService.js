import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
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

const eventService = {
  // Get all events (upcoming and ongoing)
  getAllEvents: async () => {
    try {
      const response = await api.get('/events');
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch events';
    }
  },

  // Get event by ID
  getEventById: async (id) => {
    try {
      const response = await api.get(`/events/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch event details';
    }
  },

  // Get events by status
  getEventsByStatus: async (status) => {
    try {
      const response = await api.get(`/events?status=${status}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch events';
    }
  },

  // Get events by visibility
  getEventsByVisibility: async (visibility) => {
    try {
      const response = await api.get(`/events?visibility=${visibility}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to fetch events';
    }
  },

  // Create event
  createEvent: async (eventData) => {
    try {
      const response = await api.post('/events', eventData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to create event';
    }
  },

  // Delete event
  deleteEvent: async (id) => {
    try {
      const response = await api.delete(`/events/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to delete event';
    }
  },
  updateEvent: async (eventId, eventData) => {
    try {
      const response = await api.put(`/events/${eventId}`, eventData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Failed to update event';
    }
  },};

export default eventService;
