const supabase = require('../config/supabase');

class User {
  // Find user by email
  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Create new user (for registration)
  static async create(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Get all users with optional filters
  static async getAll(filters = {}) {
    try {
      let query = supabase
        .from('users')
        .select(`
          *,
          faculty:faculties(id, code, name)
        `)
        .order('created_at', { ascending: false });

      if (filters.role) {
        query = query.eq('role', filters.role);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.facultyId) {
        query = query.eq('faculty_id', filters.facultyId);
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // Update user
  static async update(id, updates) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Check if user has ongoing or future events as organizer
  static async hasOngoingOrFutureEvents(userId) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id')
        .eq('organizer_id', userId)
        .in('status', ['upcoming', 'ongoing'])
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking ongoing events:', error);
      throw error;
    }
  }

  // Check if user has future event participations
  static async hasFutureParticipations(userId) {
    try {
      const { data, error } = await supabase
        .from('event_participation')
        .select(`
          id,
          event:events(id, status, event_end_datetime)
        `)
        .eq('user_id', userId)
        .eq('status', 'registered');

      if (error) throw error;
      
      if (!data || data.length === 0) return false;

      // Check if any events are upcoming or ongoing
      const hasFuture = data.some(participation => {
        const event = participation.event;
        if (!event) return false;
        
        if (event.status === 'upcoming' || event.status === 'ongoing') {
          return true;
        }
        
        // Also check if event end date is in the future
        const eventEnd = new Date(event.event_end_datetime);
        return eventEnd > new Date();
      });

      return hasFuture;
    } catch (error) {
      console.error('Error checking future participations:', error);
      throw error;
    }
  }

  // Count administrators
  static async countAdministrators() {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'administrator')
        .eq('status', 'active');

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error counting administrators:', error);
      throw error;
    }
  }
}

module.exports = User;
