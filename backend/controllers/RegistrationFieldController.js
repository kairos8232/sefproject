const RegistrationField = require('../models/RegistrationField');
const Event = require('../models/Event');
const supabase = require('../config/supabase');

class RegistrationFieldController {
  // Get all custom fields for an event
  static async getEventFields(req, res) {
    try {
      const { eventId } = req.params;

      // Verify event exists and user is the organizer
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Only event organizer can view custom fields configuration
      if (event.organizer_id !== req.user.userId && req.user.role !== 'administrator') {
        return res.status(403).json({ error: 'Not authorized to view this event\'s registration fields' });
      }

      const fields = await RegistrationField.getByEventId(eventId);
      
      // Check if event has registrations (to determine if fields can be edited)
      const hasRegistrations = await RegistrationField.eventHasRegistrations(eventId);

      res.json({ 
        fields,
        hasRegistrations,
        canEdit: !hasRegistrations
      });
    } catch (error) {
      console.error('Error in getEventFields:', error);
      res.status(500).json({ error: 'Failed to fetch registration fields' });
    }
  }

  // Get custom fields for public event registration (no auth required)
  static async getPublicEventFields(req, res) {
    try {
      const { eventId } = req.params;

      // Verify event exists
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const fields = await RegistrationField.getByEventId(eventId);
      res.json({ fields });
    } catch (error) {
      console.error('Error in getPublicEventFields:', error);
      res.status(500).json({ error: 'Failed to fetch registration fields' });
    }
  }

  // Create a new custom field
  static async createField(req, res) {
    try {
      const { eventId } = req.params;
      const { field_type, label, help_text, is_required, options, validation_rules } = req.body;

      // Validate required fields
      if (!field_type || !label) {
        return res.status(400).json({ error: 'Field type and label are required' });
      }

      // Validate field type
      const validFieldTypes = ['text', 'textarea', 'number', 'email', 'phone', 'dropdown', 'radio', 'checkbox', 'date'];
      if (!validFieldTypes.includes(field_type)) {
        return res.status(400).json({ error: 'Invalid field type' });
      }

      // For dropdown, radio, checkbox - options are required
      if (['dropdown', 'radio', 'checkbox'].includes(field_type)) {
        if (!options || !Array.isArray(options) || options.length === 0) {
          return res.status(400).json({ error: 'Options are required for dropdown, radio, and checkbox fields' });
        }
      }

      // Verify event exists and user is the organizer
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.organizer_id !== req.user.userId && req.user.role !== 'administrator') {
        return res.status(403).json({ error: 'Not authorized to modify this event' });
      }

      // Check if event has registrations
      const hasRegistrations = await RegistrationField.eventHasRegistrations(eventId);
      if (hasRegistrations) {
        return res.status(400).json({ error: 'Cannot add fields after participants have registered' });
      }

      const field = await RegistrationField.create(eventId, {
        field_type,
        label,
        help_text,
        is_required,
        options,
        validation_rules
      });

      res.status(201).json({ field });
    } catch (error) {
      console.error('Error in createField:', error);
      res.status(500).json({ error: 'Failed to create registration field' });
    }
  }

  // Update a custom field
  static async updateField(req, res) {
    try {
      const { eventId, fieldId } = req.params;
      const { label, help_text, is_required, options, validation_rules, field_type } = req.body;

      // Verify event exists and user is the organizer
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.organizer_id !== req.user.userId && req.user.role !== 'administrator') {
        return res.status(403).json({ error: 'Not authorized to modify this event' });
      }

      // Check if event has registrations
      const hasRegistrations = await RegistrationField.eventHasRegistrations(eventId);
      if (hasRegistrations) {
        return res.status(400).json({ error: 'Cannot edit fields after participants have registered' });
      }

      // Validate field type if provided
      if (field_type) {
        const validFieldTypes = ['text', 'textarea', 'number', 'email', 'phone', 'dropdown', 'radio', 'checkbox', 'date'];
        if (!validFieldTypes.includes(field_type)) {
          return res.status(400).json({ error: 'Invalid field type' });
        }
      }

      const field = await RegistrationField.update(fieldId, {
        label,
        help_text,
        is_required,
        options,
        validation_rules,
        field_type
      });

      res.json({ field });
    } catch (error) {
      console.error('Error in updateField:', error);
      res.status(500).json({ error: 'Failed to update registration field' });
    }
  }

  // Delete a custom field
  static async deleteField(req, res) {
    try {
      const { eventId, fieldId } = req.params;

      // Verify event exists and user is the organizer
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.organizer_id !== req.user.userId && req.user.role !== 'administrator') {
        return res.status(403).json({ error: 'Not authorized to modify this event' });
      }

      // Check if event has registrations
      const hasRegistrations = await RegistrationField.eventHasRegistrations(eventId);
      if (hasRegistrations) {
        return res.status(400).json({ error: 'Cannot delete fields after participants have registered' });
      }

      await RegistrationField.delete(fieldId);
      res.json({ message: 'Field deleted successfully' });
    } catch (error) {
      console.error('Error in deleteField:', error);
      res.status(500).json({ error: 'Failed to delete registration field' });
    }
  }

  // Reorder custom fields
  static async reorderFields(req, res) {
    try {
      const { eventId } = req.params;
      const { fieldOrders } = req.body; // Array of { id, order_index }

      if (!Array.isArray(fieldOrders)) {
        return res.status(400).json({ error: 'Field orders must be an array' });
      }

      // Verify event exists and user is the organizer
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.organizer_id !== req.user.userId && req.user.role !== 'administrator') {
        return res.status(403).json({ error: 'Not authorized to modify this event' });
      }

      await RegistrationField.reorder(eventId, fieldOrders);
      res.json({ message: 'Fields reordered successfully' });
    } catch (error) {
      console.error('Error in reorderFields:', error);
      res.status(500).json({ error: 'Failed to reorder fields' });
    }
  }

  // Save participant responses to custom fields
  static async saveResponses(req, res) {
    try {
      const { eventId } = req.params;
      const { participationId, responses } = req.body;

      if (!participationId || !Array.isArray(responses)) {
        return res.status(400).json({ error: 'Participation ID and responses array are required' });
      }



      // Verify the participation belongs to the current user
      const { data: participation, error: participationError } = await supabase
        .from('event_participation')
        .select('*')
        .eq('id', participationId)
        .eq('user_id', req.user.userId)
        .eq('event_id', eventId)
        .single();

      console.log('[RegistrationField] Participation query result:', { 
        participation, 
        error: participationError,
        hasParticipation: !!participation,
        errorMessage: participationError?.message,
        errorDetails: participationError?.details
      });

      if (participationError || !participation) {
        console.error('[RegistrationField] Participation not found:', {
          participationError,
          participationId,
          userId: req.user.userId,
          eventId
        });
        return res.status(404).json({ error: 'Participation not found or unauthorized' });
      }

      // Get all fields for validation
      const fields = await RegistrationField.getByEventId(eventId);
      
      // Validate responses
      for (const field of fields) {
        const response = responses.find(r => r.field_id === field.id);
        const value = response?.response_value || response?.response_values;
        
        // Check required
        if (field.is_required) {
          if (!response || (!response.response_value && (!response.response_values || response.response_values.length === 0))) {
            return res.status(400).json({ error: `Field "${field.label}" is required` });
          }
        }
        
        // Apply validation_rules if present and value exists
        if (value && field.validation_rules) {
          const rules = field.validation_rules;
          const fieldValue = response.response_value;
          const fieldValues = response.response_values;
          
          // String validations
          if (fieldValue && typeof fieldValue === 'string') {
            // Min length
            if (rules.minLength && fieldValue.length < rules.minLength) {
              return res.status(400).json({ 
                error: `"${field.label}" must be at least ${rules.minLength} characters` 
              });
            }
            
            // Max length
            if (rules.maxLength && fieldValue.length > rules.maxLength) {
              return res.status(400).json({ 
                error: `"${field.label}" must not exceed ${rules.maxLength} characters` 
              });
            }
            
            // Pattern (regex)
            if (rules.pattern) {
              const regex = new RegExp(rules.pattern);
              if (!regex.test(fieldValue)) {
                const message = rules.message || `"${field.label}" format is invalid`;
                return res.status(400).json({ error: message });
              }
            }
            
            // Allowed values
            if (rules.allowed && Array.isArray(rules.allowed)) {
              if (!rules.allowed.includes(fieldValue)) {
                return res.status(400).json({ 
                  error: `"${field.label}" must be one of: ${rules.allowed.join(', ')}` 
                });
              }
            }
          }
          
          // Number validations
          if (fieldValue && (field.field_type === 'number' || typeof fieldValue === 'number')) {
            const numValue = parseFloat(fieldValue);
            
            if (isNaN(numValue)) {
              return res.status(400).json({ error: `"${field.label}" must be a valid number` });
            }
            
            // Min value
            if (rules.min !== undefined && numValue < rules.min) {
              return res.status(400).json({ 
                error: `"${field.label}" must be at least ${rules.min}` 
              });
            }
            
            // Max value
            if (rules.max !== undefined && numValue > rules.max) {
              return res.status(400).json({ 
                error: `"${field.label}" must not exceed ${rules.max}` 
              });
            }
          }
          
          // Array validations (for checkbox fields)
          if (fieldValues && Array.isArray(fieldValues)) {
            // Min items
            if (rules.minItems && fieldValues.length < rules.minItems) {
              return res.status(400).json({ 
                error: `"${field.label}" requires at least ${rules.minItems} selection(s)` 
              });
            }
            
            // Max items
            if (rules.maxItems && fieldValues.length > rules.maxItems) {
              return res.status(400).json({ 
                error: `"${field.label}" allows at most ${rules.maxItems} selection(s)` 
              });
            }
          }
        }
      }

      const savedResponses = await RegistrationField.saveResponses(participationId, responses);
      res.json({ responses: savedResponses });
    } catch (error) {
      console.error('Error in saveResponses:', error);
      res.status(500).json({ error: 'Failed to save responses' });
    }
  }

  // Get participant's own responses
  static async getMyResponses(req, res) {
    try {
      const { eventId } = req.params;

      // Find user's participation
      const { data: participation, error } = await supabase
        .from('event_participation')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', req.user.userId)
        .single();

      if (error || !participation) {
        return res.status(404).json({ error: 'No registration found for this event' });
      }

      const responses = await RegistrationField.getResponses(participation.id);
      res.json({ responses });
    } catch (error) {
      console.error('Error in getMyResponses:', error);
      res.status(500).json({ error: 'Failed to fetch responses' });
    }
  }

  // Get all responses for an event (organizer only)
  static async getEventResponses(req, res) {
    try {
      const { eventId } = req.params;

      // Verify event exists and user is the organizer
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.organizer_id !== req.user.userId && req.user.role !== 'administrator') {
        return res.status(403).json({ error: 'Not authorized to view responses' });
      }

      const responses = await RegistrationField.getEventResponses(eventId);
      res.json({ responses });
    } catch (error) {
      console.error('Error in getEventResponses:', error);
      res.status(500).json({ error: 'Failed to fetch event responses' });
    }
  }
}

module.exports = RegistrationFieldController;
