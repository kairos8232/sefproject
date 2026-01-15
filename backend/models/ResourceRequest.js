const supabase = require('../config/supabase');

class ResourceRequest {
  // Get all resource requests
  static async getAll() {
    try {
      const { data, error } = await supabase
        .from('resource_requests')
        .select(`
          *,
          event:events(id, event_name, start_datetime, end_datetime, organizer_id),
          venue_booking:venue_bookings(id, venue:venues(name, code)),
          resource:resource_types(id, name, code, unit, category:resource_categories(name)),
          requester:users!requester_user_id(id, name, email),
          approver:users!approved_by(id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      // Suppress network timeout errors
      if (!error.message?.includes('fetch failed') && 
          !error.message?.includes('ETIMEDOUT') &&
          !error.message?.includes('EADDRNOTAVAIL') &&
          !error.message?.includes('ConnectTimeoutError')) {
        console.error('Error getting resource requests:', error);
      }
      throw error;
    }
  }

  // Get resource request by ID
  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('resource_requests')
        .select(`
          *,
          event:events(id, event_name, start_datetime, end_datetime, organizer_id),
          venue_booking:venue_bookings(id, venue:venues(name, code)),
          resource:resource_types(id, name, code, unit, total_quantity, category:resource_categories(name)),
          requester:users!requester_user_id(id, name, email),
          approver:users!approved_by(id, name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting resource request by ID:', error);
      throw error;
    }
  }

  // Get resource requests by event ID
  static async getByEventId(eventId) {
    try {
      const { data, error } = await supabase
        .from('resource_requests')
        .select(`
          *,
          event:events(id, event_name, start_datetime, end_datetime),
          venue_booking:venue_bookings(id, venue:venues(name, code)),
          resource:resource_types(id, name, code, unit, category:resource_categories(name)),
          requester:users!requester_user_id(id, name, email),
          approver:users!approved_by(id, name, email)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      // Suppress network timeout errors
      if (!error.message?.includes('fetch failed') && 
          !error.message?.includes('ETIMEDOUT') &&
          !error.message?.includes('EADDRNOTAVAIL') &&
          !error.message?.includes('ConnectTimeoutError')) {
        console.error('Error getting resource requests by event ID:', error);
      }
      throw error;
    }
  }

  // Get resource requests by user ID (requester)
  static async getByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('resource_requests')
        .select(`
          *,
          event:events(id, event_name, start_datetime, end_datetime),
          venue_booking:venue_bookings(id, venue:venues(name, code)),
          resource:resource_types(id, name, code, unit, category:resource_categories(name)),
          requester:users!requester_user_id(id, name, email),
          approver:users!approved_by(id, name, email)
        `)
        .eq('requester_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      // Suppress network timeout errors
      if (!error.message?.includes('fetch failed') && 
          !error.message?.includes('ETIMEDOUT') &&
          !error.message?.includes('EADDRNOTAVAIL') &&
          !error.message?.includes('ConnectTimeoutError')) {
        console.error('Error getting resource requests by user ID:', error);
      }
      throw error;
    }
  }

  // Create resource request
  static async create(requestData) {
    try {
      const { data, error } = await supabase
        .from('resource_requests')
        .insert([requestData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating resource request:', error);
      throw error;
    }
  }

  // Update resource request
  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('resource_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating resource request:', error);
      throw error;
    }
  }

  // Approve resource request
  static async approve(id, approvedBy, approvalNotes = null) {
    try {
      const { data, error } = await supabase
        .from('resource_requests')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          approval_notes: approvalNotes
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error approving resource request:', error);
      throw error;
    }
  }

  // Reject resource request
  static async reject(id, approvedBy, rejectionReason) {
    try {
      console.log('🔍 ResourceRequest.reject called:', { id, approvedBy, rejectionReason });
      
      const { data, error } = await supabase
        .from('resource_requests')
        .update({
          status: 'rejected',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error in reject:', error);
        throw error;
      }
      
      console.log('✅ Resource request rejected successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error rejecting resource request:', error);
      throw error;
    }
  }

  // Cancel resource request
  static async cancel(id, cancellationReason) {
    try {
      const { data, error } = await supabase
        .from('resource_requests')
        .update({
          status: 'cancelled',
          cancellation_reason: cancellationReason
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error cancelling resource request:', error);
      throw error;
    }
  }

  // Delete resource request
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('resource_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting resource request:', error);
      throw error;
    }
  }

  // Get all resource requests with filters (for admin)
  static async getAllWithFilters(filters = {}) {
    try {
      let query = supabase
        .from('resource_requests')
        .select(`
          *,
          event:events(id, event_name, description, start_datetime, organizer:users(id, name, email, staff_id)),
          venue_booking:venue_bookings(id, venue:venues(id, code, name, faculty:faculties(id, code, name))),
          resource:resource_types(id, code, name, unit, category:resource_categories(id, code, name)),
          requester:users!requester_user_id(id, name, email, role, staff_id),
          approver:users!approved_by(id, name, email)
        `);

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply resource filter
      if (filters.resource_id) {
        query = query.eq('resource_id', filters.resource_id);
      }

      // Apply event filter
      if (filters.event_id) {
        query = query.eq('event_id', filters.event_id);
      }

      // Apply search filter
      if (filters.search) {
        query = query.ilike('event.event_name', `%${filters.search}%`);
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'created_at';
      const sortOrder = filters.sort_order === 'asc';
      query = query.order(sortBy, { ascending: sortOrder });

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      // Suppress network timeout errors
      if (!error.message?.includes('fetch failed') && 
          !error.message?.includes('ETIMEDOUT') &&
          !error.message?.includes('EADDRNOTAVAIL') &&
          !error.message?.includes('ConnectTimeoutError')) {
        console.error('Error getting resource requests with filters:', error);
      }
      throw error;
    }
  }
}

module.exports = ResourceRequest;
