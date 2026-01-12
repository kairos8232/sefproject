import apiClient from './apiClient';

const venueBookingService = {
  // Check venue availability
  checkAvailability: async (startDatetime, endDatetime, minCapacity = null, facultyId = null) => {
    const params = {
      start_datetime: startDatetime,
      end_datetime: endDatetime
    };
    
    if (minCapacity) params.min_capacity = minCapacity;
    if (facultyId) params.faculty_id = facultyId;

    const response = await apiClient.get('/venue-bookings/availability', { params });
    return response.data;
  },

  // Get user's own bookings
  getMyBookings: async () => {
    const response = await apiClient.get('/venue-bookings/my-bookings');
    return response.data;
  },

  // Get all bookings (admin/faculty manager)
  getAllBookings: async () => {
    const response = await apiClient.get('/venue-bookings');
    return response.data;
  },

  // Get booking by ID
  getBookingById: async (id) => {
    const response = await apiClient.get(`/venue-bookings/${id}`);
    return response.data;
  },

  // Get bookings for specific event
  getBookingsByEvent: async (eventId) => {
    const response = await apiClient.get(`/venue-bookings/event/${eventId}`);
    return response.data;
  },

  // Create venue booking
  createBooking: async (bookingData) => {
    const response = await apiClient.post('/venue-bookings', bookingData);
    return response.data;
  },

  // Create venue booking package (multiple venues)
  createPackage: async (packageData) => {
    const response = await apiClient.post('/venue-bookings/package', packageData);
    return response.data;
  },

  // Update venue booking
  updateBooking: async (id, bookingData) => {
    const response = await apiClient.put(`/venue-bookings/${id}`, bookingData);
    return response.data;
  },

  // Cancel venue booking
  cancelBooking: async (id, cancellationReason = null) => {
    const response = await apiClient.post(`/venue-bookings/${id}/cancel`, { cancellation_reason: cancellationReason });
    return response.data;
  },

  // Approve booking (admin/faculty manager)
  approveBooking: async (id, approvalNotes = null) => {
    const response = await apiClient.post(`/venue-bookings/${id}/approve`, { approval_notes: approvalNotes });
    return response.data;
  },

  // Reject booking (admin/faculty manager)
  rejectBooking: async (id, rejectionReason) => {
    const response = await apiClient.post(`/venue-bookings/${id}/reject`, { rejection_reason: rejectionReason });
    return response.data;
  }
};

export default venueBookingService;
