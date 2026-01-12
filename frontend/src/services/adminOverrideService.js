import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const adminOverrideService = {
  // Get all venue booking requests
  getAllVenueBookings: async (filters = {}) => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams(filters).toString();
    const response = await axios.get(
      `${API_BASE_URL}/venue-bookings/admin/all-requests?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  },

  // Get all resource requests
  getAllResourceRequests: async (filters = {}) => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams(filters).toString();
    const response = await axios.get(
      `${API_BASE_URL}/resource-requests/admin/all-requests?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  },

  // Override venue booking
  overrideVenueBooking: async (bookingId, overrideData) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/venue-bookings/admin/${bookingId}/override`,
      overrideData,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  },

  // Override resource request
  overrideResourceRequest: async (requestId, overrideData) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/resource-requests/admin/${requestId}/override`,
      overrideData,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  }
};

export default adminOverrideService;
