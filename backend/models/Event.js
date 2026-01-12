const supabase = require('../config/supabase');

class Event {
  // Get all events (all statuses)
  static async getAll() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:organizer_id (
            id,
            email,
            name,
            role,
            faculty_id,
            faculty:faculty_id (
              id,
              code,
              name
            )
          ),
          venue_bookings (
            id,
            status,
            venue:venue_id (
              id,
              name,
              capacity
            )
          )
        `)
        .order('start_datetime', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  // Get event by ID
  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:organizer_id (
            id,
            email,
            name,
            role,
            faculty_id,
            faculty:faculty_id (
              id,
              code,
              name
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching event by ID:', error);
      throw error;
    }
  }

  // Get event by ID with venue bookings (for capacity checks)
  static async getByIdWithVenueBookings(id) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venue_bookings (
            id,
            status,
            venue:venue_id (
              id,
              name,
              capacity
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching event with venue bookings:', error);
      throw error;
    }
  }


  // Get events by status
  static async getByStatus(status) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:organizer_id (
            id,
            email,
            name,
            role,
            faculty_id,
            faculty:faculty_id (
              id,
              code,
              name
            )
          )
        `)
        .eq('status', status)
        .order('start_datetime', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching events by status:', error);
      throw error;
    }
  }

  // Get events by visibility
  static async getByVisibility(visibility) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:organizer_id (
            id,
            email,
            name,
            role,
            faculty_id,
            faculty:faculty_id (
              id,
              code,
              name
            )
          )
        `)
        .eq('visibility', visibility)
        .in('status', ['upcoming', 'ongoing'])
        .order('start_datetime', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching events by visibility:', error);
      throw error;
    }
  }

  // Get event invitations for a user
  static async getUserInvitations(userId) {
    try {
      const { data, error } = await supabase
        .from('event_invitations')
        .select('event_id')
        .eq('user_id', userId);

      if (error) throw error;
      return data.map(inv => inv.event_id);
    } catch (error) {
      console.error('Error fetching user invitations:', error);
      throw error;
    }
  }

  // Create new event
  static async create(eventData) {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  // Update event
  static async update(id, eventData) {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  // Cancel event (update status to cancelled)
  static async cancel(id) {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error cancelling event:', error);
      throw error;
    }
  }

  // Update event status (for auto-calculation persistence)
  static async updateStatus(id, status) {
    try {
      const { data, error } = await supabase
        .from('events')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating event status:', error);
      throw error;
    }
  }

  // Delete event
  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Get events with venue bookings in a specific faculty
  static async getFacultyEvents(facultyId, filters = {}) {
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          organizer:organizer_id (
            id,
            email,
            name,
            role
          ),
          venue_bookings!inner (
            id,
            status,
            requested_start_datetime,
            requested_end_datetime,
            approved_start_datetime,
            approved_end_datetime,
            setup_time,
            teardown_time,
            expected_attendees,
            venue:venue_id (
              id,
              code,
              name,
              location,
              capacity,
              faculty_id
            )
          )
        `)
        .eq('venue_bookings.venue.faculty_id', facultyId);

      // Filter by event status
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Filter by venue
      if (filters.venue_id) {
        query = query.eq('venue_bookings.venue_id', filters.venue_id);
      }

      // Filter by booking status
      if (filters.booking_status) {
        query = query.eq('venue_bookings.status', filters.booking_status);
      }

      // Filter by date range
      if (filters.start_date) {
        query = query.gte('start_datetime', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('start_datetime', filters.end_date);
      }

      query = query.order('start_datetime', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching faculty events:', error);
      throw error;
    }
  }

  // Get detailed event info for faculty review
  static async getFacultyEventDetails(eventId, facultyId) {
    try {
      // First get the event with venue booking
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          organizer:organizer_id (
            id,
            email,
            name,
            role,
            faculty_id
          ),
          venue_bookings (
            id,
            status,
            requested_start_datetime,
            requested_end_datetime,
            approved_start_datetime,
            approved_end_datetime,
            setup_time,
            teardown_time,
            expected_attendees,
            remarks,
            approval_notes,
            rejection_reason,
            approved_at,
            approved_user_id,
            package_id,
            venue:venue_id (
              id,
              code,
              name,
              location,
              capacity,
              faculty_id
            )
          )
        `)
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('Error fetching event:', eventError);
        console.error('Event ID:', eventId);
        console.error('Error code:', eventError.code);
        console.error('Error message:', eventError.message);
        if (eventError.code === 'PGRST116') {
          return null;
        }
        throw eventError;
      }

      // Verify the event is in this faculty's venues
      const hasFacultyVenue = event.venue_bookings?.some(
        booking => booking.venue?.faculty_id === facultyId
      );

      if (!hasFacultyVenue) {
        return null;
      }

      // Get organizer's faculty details if they have one
      if (event.organizer?.faculty_id) {
        const { data: faculty } = await supabase
          .from('faculties')
          .select('id, code, name')
          .eq('id', event.organizer.faculty_id)
          .single();
        
        if (faculty) {
          event.organizer.faculty = faculty;
        }
      }

      // Get resource requests for this event
      const { data: resourceRequests, error: resourceError } = await supabase
        .from('resource_requests')
        .select(`
          *,
          resource:resource_types (
            id,
            name,
            code,
            unit,
            category:resource_categories(name)
          ),
          requester:requester_user_id (
            id,
            name,
            email
          )
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (resourceError) throw resourceError;

      // Get participants count
      const { count: participantCount, error: countError } = await supabase
        .from('event_participation')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'registered');

      if (countError) throw countError;

      // Get participants list
      const { data: participants, error: participantsError } = await supabase
        .from('event_participation')
        .select(`
          *,
          user:user_id (
            id,
            name,
            email,
            role
          )
        `)
        .eq('event_id', eventId)
        .in('status', ['registered', 'attended'])
        .order('registered_at', { ascending: true });

      if (participantsError) throw participantsError;

      return {
        ...event,
        resource_requests: resourceRequests || [],
        participant_count: participantCount || 0,
        participants: participants || []
      };
    } catch (error) {
      console.error('Error fetching faculty event details:', error);
      throw error;
    }
  }
}

module.exports = Event;
