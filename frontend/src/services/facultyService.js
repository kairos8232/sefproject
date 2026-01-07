import axios from 'axios';

const API_URL = 'http://localhost:5001/api/faculties';

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

const facultyService = {
  // Get all faculties with optional filters (admin)
  getAllFaculties: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    
    const response = await api.get(`/?${params.toString()}`);
    return response.data;
  },

  // Get faculty by ID
  getFacultyById: async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  // Create new faculty (admin)
  createFaculty: async (facultyData) => {
    const response = await api.post('/', facultyData);
    return response.data;
  },

  // Update faculty (admin)
  updateFaculty: async (facultyId, facultyData) => {
    const response = await api.put(`/${facultyId}`, facultyData);
    return response.data;
  },

  // Update faculty status (admin)
  updateFacultyStatus: async (facultyId, status) => {
    const response = await api.put(`/${facultyId}/status`, { status });
    return response.data;
  },
};

export default facultyService;
