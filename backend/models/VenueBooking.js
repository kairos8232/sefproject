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
          event:events(id, event_name, description, start_datetime, end_datetime),
          venue:venues(id, code, name, capacity, location),
          approver:users!approved_user_id(id, name, email),
          requester:users!requester_user_id(id, name, email, role)
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

  // Get bookings for faculty's venues
  static async getByFacultyId(facultyId, filters = {}) {
    try {
      let query = supabase
        .from('venue_bookings')
        .select(`
          *,
          event:events(
            id, 
            event_name, 
            description, 
            event_type,
            start_datetime, 
            end_datetime, 
            organizer_id,
            organizer:users!organizer_id(id, name, email, role)
          ),
          venue:venues!inner(id, code, name, capacity, location, faculty_id, faculty:faculties(id, code, name)),
          requester:users!requester_user_id(id, name, email, role),
          approver:users!approved_user_id(id, name, email)
        `)
        .eq('venue.faculty_id', facultyId);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters.venue_id) {
        query = query.eq('venue_id', filters.venue_id);
      }

      if (filters.search) {
        query = query.or(`event.event_name.ilike.%${filters.search}%,requester.name.ilike.%${filters.search}%`);
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order === 'asc' ? { ascending: true } : { ascending: false };
      query = query.order(sortBy, sortOrder);

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting bookings by faculty ID:', error);
      throw error;
    }
  }

  // Get booking by ID with full details
  static async getByIdWithDetails(id) {
    try {
      const { data, error } = await supabase
        .from('venue_bookings')
        .select(`
          *,
          event:events(
            id, 
            event_name, 
            description, 
            event_type,
            start_datetime, 
            end_datetime, 
            organizer_id,
            organizer:users!organizer_id(id, name, email, role)
          ),
          venue:venues(
            id, 
            code, 
            name, 
            capacity, 
            location,
            faculty_id,
            faculty:faculties(id, code, name)
          ),
          requester:users!requester_user_id(id, name, email, role),
          approver:users!approved_user_id(id, name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting booking details:', error);
      throw error;
    }
  }

  // Approve booking with optional adjustments
  static async approveWithAdjustments(id, approverId, adjustments = {}) {
    try {
      const booking = await this.getById(id);
      
      // Check if booking is still pending
      if (booking.status !== 'pending') {
        throw new Error(`Booking is already ${booking.status}`);
      }

      const updateData = {
        status: 'approved',
        approved_user_id: approverId,
        approved_at: new Date().toISOString(),
        approval_notes: adjustments.approval_notes || null,
        approved_start_datetime: adjustments.approved_start_datetime || booking.requested_start_datetime,
        approved_end_datetime: adjustments.approved_end_datetime || booking.requested_end_datetime,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('venue_bookings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error approving booking:', error);
      throw error;
    }
  }

  // Admin approve - can override any status (except cancelled)
  static async adminApproveWithAdjustments(id, approverId, adjustments = {}) {
    try {
      const booking = await this.getById(id);
      
      // Only check if not cancelled
      if (booking.status === 'cancelled') {
        throw new Error('Cannot approve a cancelled booking');
      }

      const updateData = {
        status: 'approved',
        approved_user_id: approverId,
        approved_at: new Date().toISOString(),
        approval_notes: adjustments.approval_notes || null,
        approved_start_datetime: adjustments.approved_start_datetime || booking.requested_start_datetime,
        approved_end_datetime: adjustments.approved_end_datetime || booking.requested_end_datetime,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('venue_bookings')
        .update(updateData)
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

  // Reject booking with reason
  static async rejectWithReason(id, approverId, rejectionReason, allowOverride = false) {
    try {
      const booking = await this.getById(id);
      
      console.log('🔍 rejectWithReason called:', { id, approverId, rejectionReason, allowOverride, currentStatus: booking?.status });
      
      // Check if booking is still pending (unless override is allowed)
      if (!allowOverride && booking.status !== 'pending') {
        throw new Error(`Booking is already ${booking.status}`);
      }

      if (!rejectionReason || rejectionReason.trim().length < 10) {
        throw new Error('Rejection reason must be at least 10 characters');
      }

      console.log('✅ Validation passed, updating booking...');

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

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log('✅ Booking rejected successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in rejectWithReason:', error);
      throw error;
    }
  }

  // Get all bookings with filters (for admin)
  static async getAllWithFilters(filters = {}) {
    try {
      let query = supabase
        .from('venue_bookings')
        .select(`
          *,
          event:events(id, event_name, description, start_datetime, end_datetime, organizer:users(id, name, email, staff_id)),
          venue:venues(id, code, name, capacity, location, faculty_id, faculty:faculties(id, code, name)),
          requester:users!requester_user_id(id, name, email, role, staff_id),
          approver:users!approved_user_id(id, name, email)
        `);

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply venue filter
      if (filters.venue_id) {
        query = query.eq('venue_id', filters.venue_id);
      }

      // Apply faculty filter
      if (filters.faculty_id) {
        query = query.eq('venue.faculty_id', filters.faculty_id);
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order === 'asc';
      query = query.order(sortBy, { ascending: sortOrder });

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting venue bookings with filters:', error);
      throw error;
    }
  }
}

module.exports = VenueBooking;
