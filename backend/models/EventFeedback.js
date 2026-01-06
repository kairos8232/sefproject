const supabase = require('../config/supabase');

class EventFeedback {
  // Create new feedback
  static async create(feedbackData) {
    try {
      const { data, error } = await supabase
        .from('event_feedbacks')
        .insert([feedbackData])
        .select(`
          *,
          event:events(id, event_name, start_datetime, end_datetime),
          user:users(id, name, email)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating feedback:', error);
      throw error;
    }
  }

  // Update existing feedback
  static async update(id, feedbackData) {
    try {
      const { data, error} = await supabase
        .from('event_feedbacks')
        .update(feedbackData)
        .eq('id', id)
        .select(`
          *,
          event:events(id, event_name, start_datetime, end_datetime),
          user:users(id, name, email)
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating feedback:', error);
      throw error;
    }
  }

  // Get feedback by ID
  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('event_feedbacks')
        .select(`
          *,
          event:events(id, event_name, start_datetime, end_datetime),
          user:users(id, name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting feedback by ID:', error);
      throw error;
    }
  }

  // Get all feedbacks for an event
  static async getByEventId(eventId) {
    try {
      const { data, error } = await supabase
        .from('event_feedbacks')
        .select(`
          *,
          user:users(id, name, email)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting feedbacks by event ID:', error);
      throw error;
    }
  }

  // Get user's feedback for a specific event
  static async getUserFeedbackForEvent(userId, eventId) {
    try {
      const { data, error } = await supabase
        .from('event_feedbacks')
        .select(`
          *,
          event:events(id, event_name, start_datetime, end_datetime)
        `)
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No feedback found
          return null;
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error getting user feedback for event:', error);
      throw error;
    }
  }

  // Get all feedbacks by user
  static async getByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('event_feedbacks')
        .select(`
          *,
          event:events(id, event_name, start_datetime, end_datetime)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting feedbacks by user ID:', error);
      throw error;
    }
  }

  // Check if feedback can be edited (within 24 hours)
  static canEdit(createdAt) {
    const feedbackDate = new Date(createdAt);
    const now = new Date();
    const hoursSinceCreation = (now - feedbackDate) / (1000 * 60 * 60);
    return hoursSinceCreation < 24;
  }

  // Delete feedback
  static async delete(id) {
    try {
      const { error } = await supabase
        .from('event_feedbacks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw error;
    }
  }
}

module.exports = EventFeedback;
