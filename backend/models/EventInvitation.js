const supabase = require('../config/supabase');

class EventInvitation {
  // Get all invitations for an event
  static async getByEventId(eventId) {
    try {
      const { data, error } = await supabase
        .from('event_invitations')
        .select(`
          *,
          user:user_id (
            id,
            email,
            name,
            staff_id,
            role
          ),
          invited_by_user:invited_by (
            id,
            email,
            name
          )
        `)
        .eq('event_id', eventId)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting event invitations:', error);
      throw error;
    }
  }

  // Get all invitations for a user
  static async getByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('event_invitations')
        .select(`
          *,
          event:event_id (
            id,
            event_name,
            description,
            start_datetime,
            end_datetime,
            organizer:organizer_id (
              id,
              email,
              name
            )
          ),
          invited_by_user:invited_by (
            id,
            email,
            name
          )
        `)
        .eq('user_id', userId)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user invitations:', error);
      throw error;
    }
  }

  // Get specific invitation
  static async getById(invitationId) {
    try {
      const { data, error } = await supabase
        .from('event_invitations')
        .select(`
          *,
          user:user_id (
            id,
            email,
            name,
            staff_id,
            role
          ),
          event:event_id (
            id,
            event_name,
            description,
            start_datetime,
            end_datetime
          ),
          invited_by_user:invited_by (
            id,
            email,
            name
          )
        `)
        .eq('id', invitationId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error getting invitation by ID:', error);
      throw error;
    }
  }

  // Check if user has been invited to event
  static async isUserInvited(eventId, userId) {
    try {
      const { data, error } = await supabase
        .from('event_invitations')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking user invitation:', error);
      throw error;
    }
  }

  // Create single invitation
  static async create(invitationData) {
    try {
      const { data, error } = await supabase
        .from('event_invitations')
        .insert([{
          event_id: invitationData.event_id,
          user_id: invitationData.user_id,
          invited_by: invitationData.invited_by,
          status: invitationData.status || 'pending'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  }

  // Create multiple invitations (batch)
  static async createBatch(invitationDataArray) {
    try {
      const { data, error } = await supabase
        .from('event_invitations')
        .insert(invitationDataArray.map(inv => ({
          event_id: inv.event_id,
          user_id: inv.user_id,
          invited_by: inv.invited_by,
          status: 'pending'
        })))
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error creating batch invitations:', error);
      throw error;
    }
  }

  // Update invitation status (accept/decline/pending)
  static async updateStatus(invitationId, status) {
    try {
      const { data, error } = await supabase
        .from('event_invitations')
        .update({
          status: status,
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating invitation status:', error);
      throw error;
    }
  }

  // Delete invitation
  static async delete(invitationId) {
    try {
      const { error } = await supabase
        .from('event_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting invitation:', error);
      throw error;
    }
  }

  // Delete all invitations for an event
  static async deleteByEventId(eventId) {
    try {
      const { error } = await supabase
        .from('event_invitations')
        .delete()
        .eq('event_id', eventId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting event invitations:', error);
      throw error;
    }
  }

  // Get invitation count by status
  static async getCountByStatus(eventId, status) {
    try {
      const { count, error } = await supabase
        .from('event_invitations')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', status);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting invitation count:', error);
      throw error;
    }
  }

  // Get invitation statistics for an event
  static async getStatistics(eventId) {
    try {
      const [pending, accepted, declined] = await Promise.all([
        this.getCountByStatus(eventId, 'pending'),
        this.getCountByStatus(eventId, 'accepted'),
        this.getCountByStatus(eventId, 'declined')
      ]);

      return {
        total: pending + accepted + declined,
        pending,
        accepted,
        declined
      };
    } catch (error) {
      console.error('Error getting invitation statistics:', error);
      throw error;
    }
  }
}

module.exports = EventInvitation;
