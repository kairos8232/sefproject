import apiClient from './apiClient';

const resourceTypeService = {
  // Get all resource types with optional filters
  getAllTypes: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.category_id) params.append('category_id', filters.category_id);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    const response = await apiClient.get(`/resource-types?${params}`);
    return response.data;
  },

  // Create a new resource type
  createType: async (typeData) => {
    const response = await apiClient.post('/resource-types', typeData);
    return response.data;
  },

  // Update a resource type
  updateType: async (id, typeData) => {
    const response = await apiClient.put(`/resource-types/${id}`, typeData);
    return response.data;
  },

  // Update resource type status
  updateTypeStatus: async (id, status) => {
    const response = await apiClient.put(`/resource-types/${id}/status`, { status });
    return response.data;
  }
};

export default resourceTypeService;
