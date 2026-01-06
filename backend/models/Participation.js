const supabase = require('../config/supabase');

class Participation {
  // Get user's participation for a specific event
  static async getUserEventParticipation(eventId, userId) {
    try {
      const { data, error } = await supabase
        .from('event_participation')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user event participation:', error);
      throw error;
    }
  }

  // Get all participations for a user
  static async getUserParticipations(userId) {
    try {
      const { data, error } = await supabase
        .from('event_participation')
        .select(`
          *,
          event:event_id (
            id,
            event_name,
            description,
            event_type,
            status,
            start_datetime,
            end_datetime,
            visibility,
            organizer:organizer_id (
              id,
              email,
              name,
              role
            )
          )
        `)
        .eq('user_id', userId)
        .order('registered_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user participations:', error);
      throw error;
    }
  }

  // Get all participants for an event
  static async getEventParticipants(eventId) {
    try {
      const { data, error } = await supabase
        .from('event_participation')
        .select(`
          *,
          user:user_id (
            id,
            email,
            name,
            role,
            faculty_id
          )
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching event participants:', error);
      throw error;
    }
  }

  // Register user for an event (or re-register if previously cancelled)
  static async register(eventId, userId) {
    try {
      // Check if participation already exists
      const existing = await this.getUserEventParticipation(eventId, userId);
      
      if (existing) {
        // Update existing record (for re-registration after cancellation)
        const { data, error } = await supabase
          .from('event_participation')
          .update({
            status: 'registered',
            registered_at: new Date().toISOString(),
            cancelled_at: null
          })
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new record for first-time registration
        const { data, error } = await supabase
          .from('event_participation')
          .insert({
            event_id: eventId,
            user_id: userId,
            status: 'registered',
            registered_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error registering for event:', error);
      throw error;
    }
  }

  // Cancel user's participation
  static async cancel(eventId, userId) {
    try {
      const { data, error } = await supabase
        .from('event_participation')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error cancelling participation:', error);
      throw error;
    }
  }

  // Count participants for an event by status
  static async getEventParticipationCount(eventId, status = 'registered') {
    try {
      const { count, error } = await supabase
        .from('event_participation')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', status);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error counting event participants:', error);
      throw error;
    }
  }

  // Update attendance for multiple participants
  static async updateAttendance(attendanceUpdates) {
    try {
      // attendanceUpdates is an array of { participationId, attended }
      const updates = attendanceUpdates.map(async (update) => {
        const { participationId, attended } = update;
        const now = new Date().toISOString();
        
        const { data, error } = await supabase
          .from('event_participation')
          .update({
            status: attended ? 'attended' : 'registered',
            check_in_datetime: attended ? now : null,
            updated_at: now
          })
          .eq('id', participationId)
          .select()
          .single();

        if (error) throw error;
        return data;
      });

      const results = await Promise.all(updates);
      return results;
    } catch (error) {
      console.error('Error updating attendance:', error);
      throw error;
    }
  }

  // Mark single participant as attended
  static async markAttended(participationId) {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('event_participation')
        .update({
          status: 'attended',
          check_in_datetime: now,
          updated_at: now
        })
        .eq('id', participationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error marking participant as attended:', error);
      throw error;
    }
  }
}

module.exports = Participation;
