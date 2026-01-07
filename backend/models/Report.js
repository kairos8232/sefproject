const supabase = require('../config/supabase');

class Report {
  // Event Summary Report
  static async getEventSummary(filters = {}) {
    const { startDate, endDate, facultyId, eventType } = filters;
    
    let query = supabase
      .from('events')
      .select(`
        *,
        organizer:users!organizer_id (id, name, email, role, faculty_id)
      `);
    
    if (startDate) {
      query = query.gte('start_datetime', startDate);
    }
    if (endDate) {
      query = query.lte('end_datetime', endDate);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }
    
    const { data: events, error } = await query;
    
    if (error) {
      console.error('Supabase error in getEventSummary:', error);
      throw error;
    }
    
    // Filter by faculty_id client-side (events don't have faculty_id, need to check organizer's faculty)
    let filteredEvents = events;
    if (facultyId) {
      filteredEvents = events.filter(event => event.organizer?.faculty_id === facultyId);
    }
    
    return filteredEvents || [];
  }
  
  // Venue Utilization Report
  static async getVenueUtilization(filters = {}) {
    const { startDate, endDate, facultyId, venueId } = filters;
    
    let query = supabase
      .from('venue_bookings')
      .select('*')
      .eq('status', 'approved');
    
    if (startDate) {
      query = query.gte('approved_start_datetime', startDate);
    }
    if (endDate) {
      query = query.lte('approved_end_datetime', endDate);
    }
    if (venueId) {
      query = query.eq('venue_id', venueId);
    }
    
    const { data: bookings, error } = await query;
    
    if (error) throw error;
    
    // Also get venue availability blocks
    let blockQuery = supabase
      .from('venue_availability_blocks')
      .select('*');
    
    if (startDate) {
      blockQuery = blockQuery.gte('blocked_start_datetime', startDate);
    }
    if (endDate) {
      blockQuery = blockQuery.lte('blocked_end_datetime', endDate);
    }
    if (venueId) {
      blockQuery = blockQuery.eq('venue_id', venueId);
    }
    
    const { data: blocks } = await blockQuery;
    
    // Filter by faculty if needed
    let filteredBookings = bookings || [];
    let filteredBlocks = blocks || [];
    
    if (facultyId) {
      filteredBookings = filteredBookings.filter(b => b.venue_faculty_id === facultyId);
      filteredBlocks = filteredBlocks.filter(b => b.venue_faculty_id === facultyId);
    }
    
    return {
      bookings: filteredBookings,
      blocks: filteredBlocks
    };
  }
  
  // Booking and Cancellation Statistics
  static async getBookingStatistics(filters = {}) {
    const { startDate, endDate, facultyId } = filters;
    
    let query = supabase
      .from('venue_bookings')
      .select('*');
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    const { data: bookings, error } = await query;
    
    if (error) throw error;
    
    let filteredBookings = bookings || [];
    
    if (facultyId) {
      filteredBookings = filteredBookings.filter(b => b.venue_faculty_id === facultyId);
    }
    
    return filteredBookings;
  }
  
  // Resource Usage Report
  static async getResourceUsage(filters = {}) {
    const { startDate, endDate, facultyId, resourceTypeId } = filters;
    
    let query = supabase
      .from('resource_requests')
      .select('*');
    
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (resourceTypeId) {
      query = query.eq('resource_type_id', resourceTypeId);
    }
    
    const { data: requests, error } = await query;
    
    if (error) throw error;
    
    let filteredRequests = requests || [];
    
    if (facultyId) {
      filteredRequests = filteredRequests.filter(r => r.event_faculty_id === facultyId);
    }
    
    return filteredRequests;
  }
  
  // Get participation trends
  static async getParticipationTrends(filters = {}) {
    const { startDate, endDate, facultyId } = filters;
    
    let query = supabase
      .from('participation')
      .select('*');
    
    if (startDate) {
      query = query.gte('registered_at', startDate);
    }
    if (endDate) {
      query = query.lte('registered_at', endDate);
    }
    
    const { data: participations, error } = await query;
    
    if (error) throw error;
    
    let filteredParticipations = participations || [];
    
    if (facultyId) {
      filteredParticipations = filteredParticipations.filter(p => p.event_faculty_id === facultyId);
    }
    
    return filteredParticipations;
  }
}

module.exports = Report;
