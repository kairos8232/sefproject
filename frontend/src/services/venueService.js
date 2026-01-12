import apiClient from './apiClient';

const venueService = {
  // Get all venues with optional filters (admin)
  getAllVenues: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.facultyId) params.append('facultyId', filters.facultyId);
    if (filters.search) params.append('search', filters.search);
    
    const response = await apiClient.get(`/venues/admin/all?${params.toString()}`);
    return response.data;
  },

  // Get venue by ID
  getVenueById: async (id) => {
    const response = await apiClient.get(`/venues/${id}`);
    return response.data;
  },

  // Create new venue (admin)
  createVenue: async (venueData) => {
    const response = await apiClient.post('/venues/admin', venueData);
    return response.data;
  },

  // Update venue (admin)
  updateVenue: async (venueId, venueData) => {
    const response = await apiClient.put(`/venues/admin/${venueId}`, venueData);
    return response.data;
  },

  // Update venue status (admin)
  updateVenueStatus: async (venueId, status) => {
    const response = await apiClient.put(`/venues/admin/${venueId}/status`, { status });
    return response.data;
  },
};

export default venueService;
