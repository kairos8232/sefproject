import axios from 'axios';

const API_URL = 'http://localhost:5000/api/users';

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

const userService = {
  // Get all users with optional filters
  getAllUsers: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.role) params.append('role', filters.role);
    if (filters.status) params.append('status', filters.status);
    if (filters.facultyId) params.append('facultyId', filters.facultyId);
    if (filters.search) params.append('search', filters.search);
    
    const response = await api.get(`/?${params.toString()}`);
    return response.data;
  },

  // Create new user
  createUser: async (userData) => {
    const response = await api.post('/', userData);
    return response.data;
  },

  // Update user
  updateUser: async (userId, userData) => {
    const response = await api.put(`/${userId}`, userData);
    return response.data;
  },

  // Update user status
  updateUserStatus: async (userId, status) => {
    const response = await api.put(`/${userId}/status`, { status });
    return response.data;
  },

  // Update user role
  updateUserRole: async (userId, role, facultyId = null) => {
    const data = { role };
    if (facultyId !== null) {
      data.faculty_id = facultyId;
    }
    const response = await api.put(`/${userId}/role`, data);
    return response.data;
  },

  // Reset user password
  resetPassword: async (userId, password) => {
    const response = await api.put(`/${userId}/password`, { password });
    return response.data;
  },
};

export default userService;
