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
      let query = supabase
        .from('venue_bookings')
        .select('*')
        .eq('venue_id', venueId)
        .in('status', ['pending', 'approved'])
        .lt('requested_start_datetime', endDatetime)
        .gt('requested_end_datetime', startDatetime);

      // Exclude a specific booking (useful for updates)
      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking availability:', error);
        throw error;
      }
      
      // If there are any overlapping bookings, venue is not available
      const isAvailable = !data || data.length === 0;
      
      return isAvailable;
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

      console.log(`Found ${venues?.length || 0} venues in database`);

      if (!venues || venues.length === 0) {
        console.log('No venues found in database - please check if schema.sql has been executed');
        return [];
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
      const availableVenues = availabilityChecks.filter(venue => venue.isAvailable
  }
}

module.exports = Venue;
