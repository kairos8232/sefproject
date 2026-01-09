import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

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

const registrationFieldService = {
  // Get all custom fields for an event (organizer)
  async getEventFields(eventId) {
    const response = await api.get(`/events/${eventId}/registration-fields`);
    return response.data;
  },

  // Get custom fields for public event registration
  async getPublicEventFields(eventId) {
    const response = await api.get(`/events/${eventId}/registration-fields/public`);
    return response.data;
  },

  // Create a new custom field
  async createField(eventId, fieldData) {
    const response = await api.post(`/events/${eventId}/registration-fields`, fieldData);
    return response.data;
  },

  // Update a custom field
  async updateField(eventId, fieldId, fieldData) {
    const response = await api.put(`/events/${eventId}/registration-fields/${fieldId}`, fieldData);
    return response.data;
  },

  // Delete a custom field
  async deleteField(eventId, fieldId) {
    const response = await api.delete(`/events/${eventId}/registration-fields/${fieldId}`);
    return response.data;
  },

  // Reorder fields
  async reorderFields(eventId, fieldOrders) {
    const response = await api.post(`/events/${eventId}/registration-fields/reorder`, { fieldOrders });
    return response.data;
  },

  // Save participant responses
  async saveResponses(eventId, participationId, responses) {
    console.log('[RegistrationFieldService] Saving responses:', { eventId, participationId, responsesCount: responses.length });
    const response = await api.post(`/events/${eventId}/registration-responses`, {
      participationId,
      responses
    });
    console.log('[RegistrationFieldService] Responses saved:', response.data);
    return response.data;
  },

  // Get participant's own responses
  async getMyResponses(eventId) {
    const response = await api.get(`/events/${eventId}/registration-responses/my`);
    return response.data;
  },

  // Get all responses for an event (organizer)
  async getEventResponses(eventId) {
    const response = await api.get(`/events/${eventId}/registration-responses`);
    return response.data;
  }
};

export default registrationFieldService;
