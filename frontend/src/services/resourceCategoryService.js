import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const resourceCategoryService = {
  // Get all resource categories with optional filters
  getAllCategories: async (filters = {}) => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    const response = await axios.get(`${API_URL}/resource-categories?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Create a new resource category
  createCategory: async (categoryData) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/resource-categories`, categoryData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Update a resource category
  updateCategory: async (id, categoryData) => {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_URL}/resource-categories/${id}`, categoryData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Update resource category status
  updateCategoryStatus: async (id, status) => {
    const token = localStorage.getItem('token');
    const response = await axios.put(
      `${API_URL}/resource-categories/${id}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
};

export default resourceCategoryService;
