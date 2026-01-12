import apiClient from './apiClient';

const userService = {
  // Get all users with optional filters
  getAllUsers: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.role) params.append('role', filters.role);
    if (filters.status) params.append('status', filters.status);
    if (filters.facultyId) params.append('facultyId', filters.facultyId);
    if (filters.search) params.append('search', filters.search);
    
    const response = await apiClient.get(`/users?${params.toString()}`);
    return response.data;
  },

  // Create new user
  createUser: async (userData) => {
    const response = await apiClient.post('/users', userData);
    return response.data;
  },

  // Update user
  updateUser: async (userId, userData) => {
    const response = await apiClient.put(`/users/${userId}`, userData);
    return response.data;
  },

  // Update user status
  updateUserStatus: async (userId, status) => {
    const response = await apiClient.put(`/users/${userId}/status`, { status });
    return response.data;
  },

  // Update user role
  updateUserRole: async (userId, role, facultyId = null) => {
    const data = { role };
    if (facultyId !== null) {
      data.faculty_id = facultyId;
    }
    const response = await apiClient.put(`/users/${userId}/role`, data);
    return response.data;
  },

  // Reset user password
  resetPassword: async (userId, password) => {
    const response = await apiClient.put(`/users/${userId}/password`, { password });
    return response.data;
  },
};

export default userService;
