import apiClient from './apiClient';

const resourceCategoryService = {
  // Get all resource categories with optional filters
  getAllCategories: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    const response = await apiClient.get(`/resource-categories?${params}`);
    return response.data;
  },

  // Create a new resource category
  createCategory: async (categoryData) => {
    const response = await apiClient.post('/resource-categories', categoryData);
    return response.data;
  },

  // Update a resource category
  updateCategory: async (id, categoryData) => {
    const response = await apiClient.put(`/resource-categories/${id}`, categoryData);
    return response.data;
  },

  // Update resource category status
  updateCategoryStatus: async (id, status) => {
    const response = await apiClient.put(`/resource-categories/${id}/status`, { status });
    return response.data;
  }
};

export default resourceCategoryService;
