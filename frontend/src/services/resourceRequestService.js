import apiClient from './apiClient';

const resourceRequestService = {
  // Get all resource requests (faculty managers only)
  getAll: async () => {
    const response = await apiClient.get('/resource-requests');
    return response.data;
  },

  // Get user's own resource requests
  getMyRequests: async () => {
    const response = await apiClient.get('/resource-requests/my-requests');
    return response.data;
  },

  // Get resource requests by event
  getByEvent: async (eventId) => {
    const response = await apiClient.get(`/resource-requests/event/${eventId}`);
    return response.data;
  },

  // Get resource request by ID
  getById: async (id) => {
    const response = await apiClient.get(`/resource-requests/${id}`);
    return response.data;
  },

  // Check resource availability
  checkAvailability: async (startDatetime, endDatetime, category = null) => {
    const params = {
      start_datetime: startDatetime,
      end_datetime: endDatetime,
    };
    if (category) {
      params.category = category;
    }
    const response = await apiClient.get('/resource-requests/availability', { params });
    return response.data;
  },

  // Create resource request
  create: async (requestData) => {
    const response = await apiClient.post('/resource-requests', requestData);
    return response.data;
  },

  // Create resource request package (multiple resources)
  createPackage: async (packageData) => {
    const response = await apiClient.post('/resource-requests/package', packageData);
    return response.data;
  },

  // Update resource request
  update: async (id, updateData) => {
    const response = await apiClient.put(`/resource-requests/${id}`, updateData);
    return response.data;
  },

  // Approve resource request
  approve: async (id, approvalNotes = null) => {
    const response = await apiClient.post(`/resource-requests/${id}/approve`, {
      approval_notes: approvalNotes,
    });
    return response.data;
  },

  // Reject resource request
  reject: async (id, rejectionReason) => {
    const response = await apiClient.post(`/resource-requests/${id}/reject`, {
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  // Cancel resource request
  cancel: async (id, cancellationReason = null) => {
    const response = await apiClient.post(`/resource-requests/${id}/cancel`, {
      cancellation_reason: cancellationReason,
    });
    return response.data;
  },

  // Delete resource request
  delete: async (id) => {
    const response = await apiClient.delete(`/resource-requests/${id}`);
    return response.data;
  },
};

export default resourceRequestService;
