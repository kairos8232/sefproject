import apiClient from './apiClient';

const adminOverrideService = {
  // Get all venue booking requests
  getAllVenueBookings: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await apiClient.get(
      `/venue-bookings/admin/all-requests?${params}`
    );
    return response.data;
  },

  // Get all resource requests
  getAllResourceRequests: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await apiClient.get(
      `/resource-requests/admin/all-requests?${params}`
    );
    return response.data;
  },

  // Override venue booking
  overrideVenueBooking: async (bookingId, overrideData) => {
    const response = await apiClient.post(
      `/venue-bookings/admin/${bookingId}/override`,
      overrideData
    );
    return response.data;
  },

  // Override resource request
  overrideResourceRequest: async (requestId, overrideData) => {
    const response = await apiClient.post(
      `/resource-requests/admin/${requestId}/override`,
      overrideData
    );
    return response.data;
  }
};

export default adminOverrideService;
