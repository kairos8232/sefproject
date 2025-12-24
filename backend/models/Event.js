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
            role
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
            role
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
            role
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
            role
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
}

module.exports = Event;
