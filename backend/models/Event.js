const supabase = require('../config/supabase');

class Event {
  // Get all events (upcoming and ongoing)
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
            faculty_id
          )
        `)
        .in('status', ['upcoming', 'ongoing'])
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
            faculty_id
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
            faculty_id
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
            faculty_id
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
}

module.exports = Event;
