import apiClient from './apiClient';

const facultyService = {
  // Get all faculties with optional filters (admin)
  getAllFaculties: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    
    const response = await apiClient.get(`/faculties?${params.toString()}`);
    return response.data;
  },

  // Get all faculties publicly (no auth required)
  getPublicFaculties: async () => {
    const response = await apiClient.get('/faculties/public');
    return response.data;
  },

  // Get faculty by ID
  getFacultyById: async (id) => {
    const response = await apiClient.get(`/faculties/${id}`);
    return response.data;
  },

  // Create new faculty (admin)
  createFaculty: async (facultyData) => {
    const response = await apiClient.post('/faculties', facultyData);
    return response.data;
  },

  // Update faculty (admin)
  updateFaculty: async (facultyId, facultyData) => {
    const response = await apiClient.put(`/faculties/${facultyId}`, facultyData);
    return response.data;
  },

  // Update faculty status (admin)
  updateFacultyStatus: async (facultyId, status) => {
    const response = await apiClient.put(`/faculties/${facultyId}/status`, { status });
    return response.data;
  },
};

export default facultyService;
