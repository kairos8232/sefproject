import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import registrationFieldService from '../services/registrationFieldService';
import participationService from '../services/participationService';
import eventService from '../services/eventService';
import { useToast } from '../contexts/ToastContext';
import './CustomRegistrationFormPage.css';

function CustomRegistrationFormPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess } = useToast();
  
  const [event, setEvent] = useState(null);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [participationId, setParticipationId] = useState(null);
  const [requiresRegistration, setRequiresRegistration] = useState(false);

  const loadData = useCallback(async () => {
    document.title = 'Event Registration - CESMS';
    try {
      setLoading(true);
      const [eventData, fieldsData] = await Promise.all([
        eventService.getEventById(eventId),
        registrationFieldService.getPublicEventFields(eventId)
      ]);
      
      setEvent(eventData.event);
      setFields(fieldsData.fields || []);
      
      // Check if we need to create participation (user hasn't registered yet)
      if (location.state?.requiresRegistration) {
        setRequiresRegistration(true);
      } else if (location.state?.participationId) {
        // Legacy: participation already created
        setParticipationId(location.state.participationId);
      }
      
      // Initialize form data
      const initialData = {};
      fieldsData.fields.forEach(field => {
        if (field.field_type === 'checkbox') {
          initialData[field.id] = [];
        } else {
          initialData[field.id] = '';
        }
      });
      setFormData(initialData);
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to load form');
    } finally {
      setLoading(false);
    }
  }, [eventId, location.state, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInputChange = (fieldId, value, fieldType) => {
    if (fieldType === 'checkbox') {
      const currentValues = formData[fieldId] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      setFormData({ ...formData, [fieldId]: newValues });
    } else {
      setFormData({ ...formData, [fieldId]: value });
    }
  };

  const validateForm = () => {
    for (const field of fields) {
      const value = formData[field.id];
      const rules = field.validation_rules || {};
      
      // Check required
      if (field.is_required) {
        if (field.field_type === 'checkbox') {
          if (!value || value.length === 0) {
            showError(`"${field.label}" is required`);
            return false;
          }
        } else {
          if (!value || value.trim() === '') {
            showError(`"${field.label}" is required`);
            return false;
          }
        }
      }
      
      // Skip validation if no value and not required
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        continue;
      }
      
      // Email validation
      if (field.field_type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          showError(`"${field.label}" must be a valid email address`);
          return false;
        }
      }
      
      // Phone validation (basic)
      if (field.field_type === 'phone') {
        const phoneRegex = /^[\d\s\-+()]+$/;
        if (!phoneRegex.test(value)) {
          showError(`"${field.label}" must be a valid phone number`);
          return false;
        }
      }
      
      // Apply validation_rules
      if (typeof value === 'string') {
        // Min length
        if (rules.minLength && value.length < rules.minLength) {
          showError(`"${field.label}" must be at least ${rules.minLength} characters`);
          return false;
        }
        
        // Max length
        if (rules.maxLength && value.length > rules.maxLength) {
          showError(`"${field.label}" must not exceed ${rules.maxLength} characters`);
          return false;
        }
        
        // Pattern (regex)
        if (rules.pattern) {
          const regex = new RegExp(rules.pattern);
          if (!regex.test(value)) {
            const message = rules.message || `"${field.label}" format is invalid`;
            showError(message);
            return false;
          }
        }
        
        // Allowed values
        if (rules.allowed && Array.isArray(rules.allowed)) {
          if (!rules.allowed.includes(value)) {
            showError(`"${field.label}" must be one of: ${rules.allowed.join(', ')}`);
            return false;
          }
        }
      }
      
      // Number validations
      if (field.field_type === 'number') {
        const numValue = parseFloat(value);
        
        if (isNaN(numValue)) {
          showError(`"${field.label}" must be a valid number`);
          return false;
        }
        
        // Min value
        if (rules.min !== undefined && numValue < rules.min) {
          showError(`"${field.label}" must be at least ${rules.min}`);
          return false;
        }
        
        // Max value
        if (rules.max !== undefined && numValue > rules.max) {
          showError(`"${field.label}" must not exceed ${rules.max}`);
          return false;
        }
      }
      
      // Array validations (checkbox)
      if (Array.isArray(value)) {
        // Min items
        if (rules.minItems && value.length < rules.minItems) {
          showError(`"${field.label}" requires at least ${rules.minItems} selection(s)`);
          return false;
        }
        
        // Max items
        if (rules.maxItems && value.length > rules.maxItems) {
          showError(`"${field.label}" allows at most ${rules.maxItems} selection(s)`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      
      let finalParticipationId = participationId;
      
      // If we need to create participation first, do it now
      if (requiresRegistration && !participationId) {
        try {
          const result = await participationService.register(eventId);
          finalParticipationId = result.participation?.id;
          setParticipationId(finalParticipationId);
        } catch (regError) {
          console.error('[CustomRegistrationForm] Registration error:', regError);
          
          // Extract error message - handle both string and object errors
          let errorMsg;
          if (typeof regError === 'string') {
            errorMsg = regError;
          } else {
            errorMsg = regError?.response?.data?.error || regError?.message || 'Failed to register for event. Please try again.';
          }
          
          const errorLower = errorMsg.toLowerCase();
          
          // Display specific error messages
          if (errorLower.includes('full') || errorLower.includes('capacity')) {
            showError('🚫 Event is Full - Registration capacity has been reached.');
          } else if (errorLower.includes('conflict')) {
            showError('⚠️ Time Conflict - You have another event at the same time.');
          } else if (errorLower.includes('closed')) {
            showError('🔒 Registration Closed - This event is no longer accepting registrations.');
          } else if (errorLower.includes('completed') || errorLower.includes('cancelled')) {
            showError('❌ Cannot register for completed or cancelled events.');
          } else if (errorLower.includes('already registered')) {
            showError('✓ You are already registered for this event.');
          } else {
            showError(errorMsg);
          }
          setSubmitting(false);
          return;
        }
      }
      
      if (!finalParticipationId) {
        showError('Failed to create registration. Please try again.');
        setSubmitting(false);
        return;
      }
      
      // Format responses for API
      const responses = fields.map(field => {
        const value = formData[field.id];
        
        if (field.field_type === 'checkbox') {
          return {
            field_id: field.id,
            response_value: null,
            response_values: value
          };
        } else {
          return {
            field_id: field.id,
            response_value: value,
            response_values: null
          };
        }
      });

      await registrationFieldService.saveResponses(eventId, finalParticipationId, responses);
      
      showSuccess('Registration completed successfully!');
      // Navigate back to event details page
      navigate(`/events/${eventId}`);
    } catch (err) {
      console.error('[CustomRegistrationForm] Form submission error:', err);
      console.error('[CustomRegistrationForm] Error response:', err.response);
      showError(err.response?.data?.error || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.id];
    const rules = field.validation_rules || {};

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type)}
            required={field.is_required}
            minLength={rules.minLength}
            maxLength={rules.maxLength}
            pattern={rules.pattern}
            title={rules.message}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type)}
            required={field.is_required}
            minLength={rules.minLength}
            maxLength={rules.maxLength}
            rows="4"
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type)}
            required={field.is_required}
            min={rules.min}
            max={rules.max}
          />
        );
      
      case 'email':
        return (
          <input
            type="email"
            value={value || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type)}
            required={field.is_required}
            minLength={rules.minLength}
            maxLength={rules.maxLength}
            pattern={rules.pattern}
          />
        );
      
      case 'phone':
        return (
          <input
            type="tel"
            value={value || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type)}
            required={field.is_required}
            placeholder="e.g., +60 12 345 6789"
            minLength={rules.minLength}
            maxLength={rules.maxLength}
            pattern={rules.pattern}
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type)}
            required={field.is_required}
            min={rules.min}
            max={rules.max}
          />
        );
      
      case 'dropdown':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type)}
            required={field.is_required}
          >
            <option value="">Select...</option>
            {field.options && field.options.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );
      
      case 'radio':
        return (
          <div className="radio-group">
            {field.options && field.options.map((opt, i) => (
              <label key={i} className="radio-option">
                <input
                  type="radio"
                  name={field.id}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type)}
                  required={field.is_required}
                />
                {opt}
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="checkbox-group">
            {field.options && field.options.map((opt, i) => (
              <label key={i} className="checkbox-option">
                <input
                  type="checkbox"
                  value={opt}
                  checked={(value || []).includes(opt)}
                  onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type)}
                />
                {opt}
              </label>
            ))}
          </div>
        );
      
      default:
        return <input type="text" value={value || ''} />;
    }
  };

  if (loading) {
    return (
      <div className="custom-registration-form-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (fields.length === 0) {
    // No custom fields - redirect to my events
    showSuccess('Registration completed successfully!');
    navigate('/my-events');
    return null;
  }

  return (
    <div className="custom-registration-form-page">
      <div className="form-container">
        <div className="form-header">
          <h1>Complete Your Registration</h1>
          <p className="crfp-event-name">{event?.event_name}</p>
          <p className="form-subtitle">
            Please fill out the following information to complete your registration
          </p>
        </div>

        <form onSubmit={handleSubmit} className="registration-form">
          {fields.map((field) => (
            <div key={field.id} className="form-field">
              <label>
                {field.label}
                {field.is_required && <span className="required-star">*</span>}
              </label>
              {field.help_text && (
                <p className="field-help-text">{field.help_text}</p>
              )}
              {renderField(field)}
            </div>
          ))}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                showError('Registration cancelled. You are not registered for this event.');
                navigate('/events');
              }}
              className="skip-button"
              disabled={submitting}
            >
              Skip for Now
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomRegistrationFormPage;
