import axios from 'axios';

const API_URL = 'http://localhost:5001/api/venue-availability';

// Add auth token to requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getBlockedSlots = async (venueId = null) => {
  const params = venueId ? { venue_id: venueId } : {};
  const response = await axios.get(API_URL, { params });
  return response.data;
};

export const createBlock = async (blockData) => {
  const response = await axios.post(API_URL, blockData);
  return response.data;
};

export const updateBlock = async (blockId, updates) => {
  const response = await axios.put(`${API_URL}/${blockId}`, updates);
  return response.data;
};

export const deleteBlock = async (blockId) => {
  const response = await axios.delete(`${API_URL}/${blockId}`);
  return response.data;
};
