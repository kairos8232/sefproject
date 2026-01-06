const supabase = require('../config/supabase');

class VenueBooking {
  // Get all venue bookings
  static async getAll() {
    try {
      const { data, error } = await supabase
        .from('venue_bookings')
        .select(`
          *,
          event:events(id, event_name, start_datetime, end_datetime),
          venue:venues(id, code, name, capacity, location),
          requester:users!requester_user_id(id, name, email),
          approver:users!approved_user_id(id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting venue bookings:', error);
      throw error;
    }
  }

  // Get venue booking by ID
  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('venue_bookings')
        .select(`
          *,
          event:events(id, event_name, start_datetime, end_datetime, organizer_id),
          venue:venues(id, code, name, capacity, location, faculty:faculties(code, name)),
          requester:users!requester_user_id(id, name, email),
          approver:users!approved_user_id(id, name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting venue booking by ID:', error);
      throw error;
    }
  }

  // Get bookings by event ID
  static async getByEventId(eventId) {
    try {
      const { data, error } = await supabase
        .from('venue_bookings')
        .select(`
          *,
          venue:venues(id, code, name, capacity, location, faculty_id, faculty:faculties(id, code, name)),
          requester:users!requester_user_id(id, name, email),
          approver:users!approved_user_id(id, name, email)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting bookings by event ID:', error);
      throw error;
    }
  }

  // Get bookings by user (requester)
  static async getByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('venue_bookings')
        .select(`
          *,
          event:events(id, event_name, start_datetime, end_datetime),
          venue:venues(id, code, name, capacity, location),
          approver:users!approved_user_id(id, name, email)
        `)
        .eq('requester_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting bookings by user ID:', error);
      throw error;
    }
  }

  // Get bookings by status
  static async getByStatus(status) {
    try {
      const { data, error } = await supabase
        .from('venue_bookings')
        .select(`
          *,
          event:events(id, event_name, start_datetime, end_datetime),
          venue:venues(id, code, name, capacity, location),
          requester:users!requester_user_id(id, name, email),
          approver:users!approved_user_id(id, name, email)
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting bookings by status:', error);
      throw error;
    }
  }

  // Create new venue booking
  static async create(bookingData) {
    try {
      const { data, error } = await supabase
        .from('venue_bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating venue booking:', error);
      throw error;
    }
  }

  // Update venue booking
  static async update(id, bookingData) {
    try {
      const { data, error } = await supabase
        .from('venue_bookings')
        .update(bookingData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating venue booking:', error);
      throw error;
    }
  }

  // Delete venue booking
  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('venue_bookings')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting venue booking:', error);
      throw error;
    }
  }

  // Approve booking
  static async approve(id, approverId, approvalNotes = null) {
    try {
      const booking = await this.getById(id);
      
      const { data, error } = await supabase
        .from('venue_bookings')
        .update({
          status: 'approved',
          approved_user_id: approverId,
          approved_at: new Date().toISOString(),
          approval_notes: approvalNotes,
          approved_start_datetime: booking.requested_start_datetime,
          approved_end_datetime: booking.requested_end_datetime,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error approving venue booking:', error);
      throw error;
    }
  }

  // Reject booking
  static async reject(id, approverId, rejectionReason) {
    try {
      const { data, error } = await supabase
        .from('venue_bookings')
        .update({
          status: 'rejected',
          approved_user_id: approverId,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error rejecting venue booking:', error);
      throw error;
    }
  }

  // Cancel booking
  static async cancel(id, cancellationReason = null) {
    try {
      const { data, error } = await supabase
        .from('venue_bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: cancellationReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error cancelling venue booking:', error);
      throw error;
    }
  }
}

module.exports = VenueBooking;
