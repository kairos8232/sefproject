const supabase = require('../config/supabase');

class Venue {
  // Get all venues
  static async getAll() {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select(`
          *,
          faculty:faculties(code, name)
        `)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting venues:', error);
      throw error;
    }
  }

  // Get venue by ID
  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select(`
          *,
          faculty:faculties(code, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting venue by ID:', error);
      throw error;
    }
  }

  // Check venue availability for a specific date/time range
  static async checkAvailability(venueId, startDatetime, endDatetime, excludeBookingId = null) {
    try {
      // Check for overlapping bookings
      // A booking overlaps if: booking_start < search_end AND booking_end > search_start
      // Need to account for setup and teardown time in existing bookings
      let query = supabase
        .from('venue_bookings')
        .select('id, requested_start_datetime, requested_end_datetime, setup_time, teardown_time, status')
        .eq('venue_id', venueId)
        .in('status', ['pending', 'approved']);

      // Exclude a specific booking (useful for updates)
      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking availability:', error);
        throw error;
      }
      
      // Check each booking for overlap, including setup and teardown time
      const hasOverlap = data && data.some(booking => {
        // Calculate actual start time (including setup)
        const bookingStart = new Date(booking.requested_start_datetime);
        const setupMinutes = booking.setup_time || 0;
        const actualStart = new Date(bookingStart.getTime() - setupMinutes * 60 * 1000);
        
        // Calculate actual end time (including teardown)
        const bookingEnd = new Date(booking.requested_end_datetime);
        const teardownMinutes = booking.teardown_time || 0;
        const actualEnd = new Date(bookingEnd.getTime() + teardownMinutes * 60 * 1000);
        
        // Check for overlap
        const searchStart = new Date(startDatetime);
        const searchEnd = new Date(endDatetime);
        
        const overlaps = actualStart < searchEnd && actualEnd > searchStart;
        
        return overlaps;
      });
      
      return !hasOverlap;
    } catch (error) {
      console.error('Error checking venue availability:', error);
      // If there's an error (like table doesn't exist), assume venue is available
      return true;
    }
  }

  // Get available venues based on requirements
  static async getAvailableVenues(startDatetime, endDatetime, minCapacity = null, facultyId = null) {
    try {
      // Get all active venues with optional filters
      let query = supabase
        .from('venues')
        .select(`
          *,
          faculty:faculties(code, name)
        `)
        .eq('status', 'active');

      if (minCapacity) {
        query = query.gte('capacity', minCapacity);
      }

      if (facultyId) {
        query = query.eq('faculty_id', facultyId);
      }

      const { data: venues, error } = await query.order('name', { ascending: true });

      if (error) {
        console.error('Error fetching venues:', error);
        throw error;
      }

      if (!venues || venues.length === 0) {
        return [];
      }

      // Check availability for each venue
      const availabilityChecks = await Promise.all(
        venues.map(async (venue) => {
          const isAvailable = await this.checkAvailability(venue.id, startDatetime, endDatetime);
          return { ...venue, isAvailable };
        })
      );

      // Return only available venues
      const availableVenues = availabilityChecks.filter(venue => venue.isAvailable);
      
      return availableVenues;
    } catch (error) {
      console.error('Error getting available venues:', error);
      throw error;
    }
  }
}

module.exports = Venue;
