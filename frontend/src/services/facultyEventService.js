import apiClient from './apiClient';

// Get all events in faculty's venues with filters
export const getFacultyEvents = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.venue_id) params.append('venue_id', filters.venue_id);
    if (filters.booking_status) params.append('booking_status', filters.booking_status);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);

    const response = await apiClient.get(`/events/faculty/events?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching faculty events:', error);
    throw error;
  }
};

// Get detailed event information
export const getFacultyEventById = async (eventId) => {
  try {
    const response = await apiClient.get(`/events/faculty/events/${eventId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching faculty event details:', error);
    throw error;
  }
};

const facultyEventService = {
  getFacultyEvents,
  getFacultyEventById,
};

export default facultyEventService;
