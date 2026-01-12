const supabase = require('../config/supabase');

class Session {
  // Create new session
  static async createSession(userId, role, token, expiresAt = null) {
    try {
      const computedExpiry = expiresAt instanceof Date
        ? expiresAt
        : new Date(Date.now() + 15 * 60 * 1000);

      const { data, error } = await supabase
        .from('sessions')
        .insert([{
          user_id: userId,
          role: role,
          token: token,
          expires_at: computedExpiry.toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  // Find session by token
  static async findByToken(token) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('token', token)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      // Check if session is expired
      if (new Date(data.expires_at) < new Date()) {
        await this.deleteSession(token);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error finding session:', error);
      throw error;
    }
  }

  // Delete session (logout)
  static async deleteSession(token) {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('token', token);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  // Clean expired sessions
  static async cleanExpiredSessions() {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error cleaning expired sessions:', error);
      throw error;
    }
  }
}

module.exports = Session;
