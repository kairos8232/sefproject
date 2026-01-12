import apiClient from './apiClient';

const registrationFieldService = {
  // Get all custom fields for an event (organizer)
  async getEventFields(eventId) {
    const response = await apiClient.get(`/events/${eventId}/registration-fields`);
    return response.data;
  },

  // Get custom fields for public event registration
  async getPublicEventFields(eventId) {
    const response = await apiClient.get(`/events/${eventId}/registration-fields/public`);
    return response.data;
  },

  // Create a new custom field
  async createField(eventId, fieldData) {
    const response = await apiClient.post(`/events/${eventId}/registration-fields`, fieldData);
    return response.data;
  },

  // Update a custom field
  async updateField(eventId, fieldId, fieldData) {
    const response = await apiClient.put(`/events/${eventId}/registration-fields/${fieldId}`, fieldData);
    return response.data;
  },

  // Delete a custom field
  async deleteField(eventId, fieldId) {
    const response = await apiClient.delete(`/events/${eventId}/registration-fields/${fieldId}`);
    return response.data;
  },

  // Reorder fields
  async reorderFields(eventId, fieldOrders) {
    const response = await apiClient.post(`/events/${eventId}/registration-fields/reorder`, { fieldOrders });
    return response.data;
  },

  // Save participant responses
  async saveResponses(eventId, participationId, responses) {
    console.log('[RegistrationFieldService] Saving responses:', { eventId, participationId, responsesCount: responses.length });
    const response = await apiClient.post(`/events/${eventId}/registration-responses`, {
      participationId,
      responses
    });
    console.log('[RegistrationFieldService] Responses saved:', response.data);
    return response.data;
  },

  // Get participant's own responses
  async getMyResponses(eventId) {
    const response = await apiClient.get(`/events/${eventId}/registration-responses/my`);
    return response.data;
  },

  // Get all responses for an event (organizer)
  async getEventResponses(eventId) {
    const response = await apiClient.get(`/events/${eventId}/registration-responses`);
    return response.data;
  }
};

export default registrationFieldService;
