const supabase = require('../config/supabase');

class VenueAvailability {
  // Get all blocked slots across all faculties (admin only)
  static async getAllBlocks() {
    try {
      const { data, error } = await supabase
        .from('venue_availability_blocks')
        .select(`
          *,
          venue:venue_id (
            id,
            code,
            name,
            faculty_id,
            faculty:faculty_id (
              id,
              name,
              code
            )
          ),
          creator:created_by (
            id,
            name,
            email
          )
        `)
        .order('blocked_start_datetime', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all blocked slots:', error);
      throw error;
    }
  }

  // Get all blocked time slots for a venue
  static async getBlockedSlots(venueId) {
    try {
      const { data, error } = await supabase
        .from('venue_availability_blocks')
        .select('*')
        .eq('venue_id', venueId)
        .order('blocked_start_datetime', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting blocked slots:', error);
      throw error;
    }
  }

  // Get all blocked slots for venues in a faculty
  static async getFacultyBlockedSlots(facultyId) {
    try {
      const { data, error } = await supabase
        .from('venue_availability_blocks')
        .select(`
          *,
          venue:venue_id (
            id,
            code,
            name,
            faculty_id
          )
        `)
        .eq('venue.faculty_id', facultyId)
        .order('blocked_start_datetime', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting faculty blocked slots:', error);
      throw error;
    }
  }

  // Create a new blocked time slot
  static async createBlock(blockData) {
    try {
      const { data, error } = await supabase
        .from('venue_availability_blocks')
        .insert([{
          venue_id: blockData.venue_id,
          blocked_start_datetime: blockData.blocked_start_datetime,
          blocked_end_datetime: blockData.blocked_end_datetime,
          reason: blockData.reason || null,
          created_by: blockData.created_by
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating blocked slot:', error);
      throw error;
    }
  }

  // Update an existing blocked time slot
  static async updateBlock(blockId, updates) {
    try {
      const { data, error } = await supabase
        .from('venue_availability_blocks')
        .update({
          blocked_start_datetime: updates.blocked_start_datetime,
          blocked_end_datetime: updates.blocked_end_datetime,
          reason: updates.reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', blockId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating blocked slot:', error);
      throw error;
    }
  }

  // Delete a blocked time slot
  static async deleteBlock(blockId) {
    try {
      const { error } = await supabase
        .from('venue_availability_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting blocked slot:', error);
      throw error;
    }
  }

  // Check if a time slot conflicts with existing blocks
  static async checkConflict(venueId, startDatetime, endDatetime, excludeBlockId = null) {
    try {
      let query = supabase
        .from('venue_availability_blocks')
        .select('*')
        .eq('venue_id', venueId)
        .lt('blocked_start_datetime', endDatetime)
        .gt('blocked_end_datetime', startDatetime);

      if (excludeBlockId) {
        query = query.neq('id', excludeBlockId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking block conflict:', error);
      throw error;
    }
  }

  // Check if a time slot conflicts with approved venue bookings
  static async checkBookingConflict(venueId, startDatetime, endDatetime) {
    try {
      const { data, error } = await supabase
        .from('venue_bookings')
        .select('*')
        .eq('venue_id', venueId)
        .eq('status', 'approved')
        .lt('approved_start_datetime', endDatetime)
        .gt('approved_end_datetime', startDatetime);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking booking conflict:', error);
      throw error;
    }
  }
}

module.exports = VenueAvailability;
