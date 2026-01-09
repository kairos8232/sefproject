import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import registrationFieldService from '../services/registrationFieldService';
import participationService from '../services/participationService';
import eventService from '../services/eventService';
import './CustomRegistrationFormPage.css';

function CustomRegistrationFormPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [event, setEvent] = useState(null);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
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
      setError(err.response?.data?.error || 'Failed to load form');
    } finally {
      setLoading(false);
    }
  }, [eventId, location.state]);

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
      if (field.is_required) {
        const value = formData[field.id];
        if (field.field_type === 'checkbox') {
          if (!value || value.length === 0) {
            setError(`"${field.label}" is required`);
            return false;
          }
        } else {
          if (!value || value.trim() === '') {
            setError(`"${field.label}" is required`);
            return false;
          }
        }
      }
      
      // Email validation
      if (field.field_type === 'email' && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.id])) {
          setError(`"${field.label}" must be a valid email address`);
          return false;
        }
      }
      
      // Phone validation (basic)
      if (field.field_type === 'phone' && formData[field.id]) {
        const phoneRegex = /^[\d\s\-+()]+$/;
        if (!phoneRegex.test(formData[field.id])) {
          setError(`"${field.label}" must be a valid phone number`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      
      let finalParticipationId = participationId;
      
      // If we need to create participation first, do it now
      if (requiresRegistration && !participationId) {
        try {
          console.log('[CustomRegistrationForm] Creating participation for event:', eventId);
          const result = await participationService.register(eventId);
          console.log('[CustomRegistrationForm] Participation created:', result);
          finalParticipationId = result.participation?.id;
          setParticipationId(finalParticipationId);
        } catch (regError) {
          console.error('[CustomRegistrationForm] Registration error:', regError);
          const errorMsg = regError?.response?.data?.error || regError?.message || 'Failed to register for event. Please try again.';
          setError(errorMsg);
          setSubmitting(false);
          return;
        }
      }
      
      if (!finalParticipationId) {
        setError('Failed to create registration. Please try again.');
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
      console.log('[CustomRegistrationForm] Responses saved successfully');
      
      // Navigate to success page or my events
      navigate('/my-events', {
        state: { 
          message: 'Registration completed successfully!',
          fromCustomForm: true
        }
      });
    } catch (err) {
      console.error('[CustomRegistrationForm] Form submission error:', err);
      console.error('[CustomRegistrationForm] Error response:', err.response);
      setError(err.response?.data?.error || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.id];

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type)}
            required={field.is_required}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type)}
            required={field.is_required}
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
          />
        );
      
      case 'email':
        return (
          <input
            type="email"
            value={value || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type)}
            required={field.is_required}
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
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value, field.field_type)}
            required={field.is_required}
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
    navigate('/my-events', {
      state: { message: 'Registration completed successfully!' }
    });
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

        {error && <div className="error-message">{error}</div>}

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
              onClick={() => navigate('/events', { state: { message: 'Registration cancelled. You are not registered for this event.' } })}
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
