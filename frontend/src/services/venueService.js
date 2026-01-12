import axios from 'axios';

const API_URL = 'http://localhost:5000/api/venues';

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

const venueService = {
  // Get all venues with optional filters (admin)
  getAllVenues: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.facultyId) params.append('facultyId', filters.facultyId);
    if (filters.search) params.append('search', filters.search);
    
    const response = await api.get(`/admin/all?${params.toString()}`);
    return response.data;
  },

  // Get venue by ID
  getVenueById: async (id) => {
    const response = await api.get(`/${id}`);
    return response.data;
  },

  // Create new venue (admin)
  createVenue: async (venueData) => {
    const response = await api.post('/admin', venueData);
    return response.data;
  },

  // Update venue (admin)
  updateVenue: async (venueId, venueData) => {
    const response = await api.put(`/admin/${venueId}`, venueData);
    return response.data;
  },

  // Update venue status (admin)
  updateVenueStatus: async (venueId, status) => {
    const response = await api.put(`/admin/${venueId}/status`, { status });
    return response.data;
  },
};

export default venueService;
