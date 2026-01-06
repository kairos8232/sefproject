import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Create axios instance with token interceptor
const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const resourceRequestService = {
  // Get all resource requests (faculty managers only)
  getAll: async () => {
    const response = await api.get('/resource-requests');
    return response.data;
  },

  // Get user's own resource requests
  getMyRequests: async () => {
    const response = await api.get('/resource-requests/my-requests');
    return response.data;
  },

  // Get resource requests by event
  getByEvent: async (eventId) => {
    const response = await api.get(`/resource-requests/event/${eventId}`);
    return response.data;
  },

  // Get resource request by ID
  getById: async (id) => {
    const response = await api.get(`/resource-requests/${id}`);
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
    const response = await api.get('/resource-requests/availability', { params });
    return response.data;
  },

  // Create resource request
  create: async (requestData) => {
    const response = await api.post('/resource-requests', requestData);
    return response.data;
  },

  // Update resource request
  update: async (id, updateData) => {
    const response = await api.put(`/resource-requests/${id}`, updateData);
    return response.data;
  },

  // Approve resource request
  approve: async (id, approvalNotes = null) => {
    const response = await api.post(`/resource-requests/${id}/approve`, {
      approval_notes: approvalNotes,
    });
    return response.data;
  },

  // Reject resource request
  reject: async (id, rejectionReason) => {
    const response = await api.post(`/resource-requests/${id}/reject`, {
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  // Cancel resource request
  cancel: async (id, cancellationReason = null) => {
    const response = await api.post(`/resource-requests/${id}/cancel`, {
      cancellation_reason: cancellationReason,
    });
    return response.data;
  },

  // Delete resource request
  delete: async (id) => {
    const response = await api.delete(`/resource-requests/${id}`);
    return response.data;
  },
};

export default resourceRequestService;
