const supabase = require('../config/supabase');

class RegistrationField {
  // Get all custom fields for an event (ordered by order_index)
  static async getByEventId(eventId) {
    try {
      const { data, error } = await supabase
        .from('event_registration_fields')
        .select('*')
        .eq('event_id', eventId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching registration fields:', error);
      throw error;
    }
  }

  // Create a new custom field
  static async create(eventId, fieldData) {
    try {
      // Get the current max order_index for this event
      const { data: existingFields } = await supabase
        .from('event_registration_fields')
        .select('order_index')
        .eq('event_id', eventId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingFields && existingFields.length > 0 
        ? existingFields[0].order_index + 1 
        : 0;

      const { data, error } = await supabase
        .from('event_registration_fields')
        .insert([{
          event_id: eventId,
          field_type: fieldData.field_type,
          label: fieldData.label,
          help_text: fieldData.help_text || null,
          is_required: fieldData.is_required || false,
          options: fieldData.options || null,
          validation_rules: fieldData.validation_rules || null,
          order_index: nextOrderIndex
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating registration field:', error);
      throw error;
    }
  }

  // Update an existing field
  static async update(fieldId, fieldData) {
    try {
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (fieldData.label !== undefined) updateData.label = fieldData.label;
      if (fieldData.help_text !== undefined) updateData.help_text = fieldData.help_text;
      if (fieldData.is_required !== undefined) updateData.is_required = fieldData.is_required;
      if (fieldData.options !== undefined) updateData.options = fieldData.options;
      if (fieldData.validation_rules !== undefined) updateData.validation_rules = fieldData.validation_rules;
      if (fieldData.field_type !== undefined) updateData.field_type = fieldData.field_type;

      const { data, error } = await supabase
        .from('event_registration_fields')
        .update(updateData)
        .eq('id', fieldId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating registration field:', error);
      throw error;
    }
  }

  // Delete a field
  static async delete(fieldId) {
    try {
      const { error } = await supabase
        .from('event_registration_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting registration field:', error);
      throw error;
    }
  }

  // Reorder fields for an event
  static async reorder(eventId, fieldOrders) {
    try {
      // fieldOrders is an array of { id, order_index }
      const updates = fieldOrders.map(({ id, order_index }) =>
        supabase
          .from('event_registration_fields')
          .update({ order_index, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('event_id', eventId)
      );

      await Promise.all(updates);
      return true;
    } catch (error) {
      console.error('Error reordering registration fields:', error);
      throw error;
    }
  }

  // Check if event has any registrations
  static async eventHasRegistrations(eventId, organizerId = null) {
    try {
      let query = supabase
        .from('event_participation')
        .select('id, user_id')
        .eq('event_id', eventId)
        .neq('status', 'cancelled'); // Exclude cancelled participations

      const { data, error } = await query;

      if (error) throw error;
      
      // If organizer ID is provided, exclude organizer's participation from count
      // Only count "real" registrations (other participants)
      if (organizerId && data) {
        const nonOrganizerParticipations = data.filter(p => p.user_id !== organizerId);
        return nonOrganizerParticipations.length > 0;
      }
      
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking event registrations:', error);
      throw error;
    }
  }

  // Save participant responses to custom fields
  static async saveResponses(participationId, responses) {
    try {
      // responses is an array of { field_id, response_value, response_values }
      const inserts = responses.map(response => ({
        participation_id: participationId,
        field_id: response.field_id,
        response_value: response.response_value || null,
        response_values: response.response_values || null
      }));

      // Use upsert to handle both create and update
      const { data, error } = await supabase
        .from('event_registration_responses')
        .upsert(inserts, {
          onConflict: 'participation_id,field_id'
        })
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving registration responses:', error);
      throw error;
    }
  }

  // Get participant responses
  static async getResponses(participationId) {
    try {
      const { data, error } = await supabase
        .from('event_registration_responses')
        .select(`
          *,
          field:event_registration_fields(*)
        `)
        .eq('participation_id', participationId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching registration responses:', error);
      throw error;
    }
  }

  // Get all responses for an event (for organizer to view)
  static async getEventResponses(eventId) {
    try {
      const { data, error } = await supabase
        .from('event_registration_responses')
        .select(`
          *,
          field:event_registration_fields(*),
          participation:event_participation(
            id,
            user:users(id, name, email)
          )
        `)
        .eq('participation.event_id', eventId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching event responses:', error);
      throw error;
    }
  }
}

module.exports = RegistrationField;
