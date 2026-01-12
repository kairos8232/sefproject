import apiClient from './apiClient';

export const getBlockedSlots = async (venueId = null) => {
  const params = venueId ? { venue_id: venueId } : {};
  const response = await apiClient.get('/venue-availability', { params });
  return response.data;
};

export const createBlock = async (blockData) => {
  const response = await apiClient.post('/venue-availability', blockData);
  return response.data;
};

export const updateBlock = async (blockId, updates) => {
  const response = await apiClient.put(`/venue-availability/${blockId}`, updates);
  return response.data;
};

export const deleteBlock = async (blockId) => {
  const response = await apiClient.delete(`/venue-availability/${blockId}`);
  return response.data;
};
