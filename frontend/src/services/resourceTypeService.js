import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const resourceTypeService = {
  // Get all resource types with optional filters
  getAllTypes: async (filters = {}) => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    
    if (filters.category_id) params.append('category_id', filters.category_id);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    const response = await axios.get(`${API_URL}/resource-types?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Create a new resource type
  createType: async (typeData) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/resource-types`, typeData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Update a resource type
  updateType: async (id, typeData) => {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_URL}/resource-types/${id}`, typeData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Update resource type status
  updateTypeStatus: async (id, status) => {
    const token = localStorage.getItem('token');
    const response = await axios.put(
      `${API_URL}/resource-types/${id}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
};

export default resourceTypeService;
