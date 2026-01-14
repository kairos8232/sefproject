const supabase = require('../config/supabase');

class Session {
  // Create new session with retry logic
  static async createSession(userId, role, token, expiresAt = null, retries = 3) {
    const computedExpiry = expiresAt instanceof Date
      ? expiresAt
      : new Date(Date.now() + 15 * 60 * 1000);

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Delete any existing sessions for this user to avoid duplicate token errors
        try {
          await supabase
            .from('sessions')
            .delete()
            .eq('user_id', userId);
        } catch (deleteError) {
          console.error('Warning: Could not delete old sessions:', deleteError);
        }

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

        if (error) {
          // If duplicate key error and not last attempt, retry with delay
          if (error.code === '23505' && attempt < retries - 1) {
            const delay = Math.pow(2, attempt) * 100; // Exponential backoff: 100ms, 200ms, 400ms
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw error;
        }
        return data;
      } catch (error) {
        if (attempt === retries - 1) {
          console.error('Error creating session after retries:', error);
          throw error;
        }
      }
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
