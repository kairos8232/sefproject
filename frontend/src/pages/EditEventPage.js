import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import eventService from '../services/eventService';
import authService from '../services/authService';
import { toDateTimeLocalInput, fromDateTimeLocalInput } from '../utils/dateUtils';
import './CreateEventPage.css'; // Reuse CreateEventPage styles

const eventTypes = [
  { value: 'seminar', label: 'Seminar' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'sports', label: 'Sports' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'career', label: 'Career' },
  { value: 'orientation', label: 'Orientation' },
  { value: 'networking', label: 'Networking' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other (Specify)' }
];

const visibilityOptions = [
  { value: 'campuswide', label: 'Campus Wide - All users can see' },
  { value: 'facultyonly', label: 'Faculty Only - Only your faculty members' },
  { value: 'inviteonly', label: 'Invite Only - Only invited users' }
];

function EditEventPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = authService.getCurrentUser();

  // Check if user can change visibility (only event_organizer and administrator)
  const canChangeVisibility = user.role === 'event_organizer' || user.role === 'administrator';

  const [formData, setFormData] = useState({
    event_name: '',
    description: '',
    visibility: 'campuswide',
    event_type: 'seminar',
    start_datetime: '',
    end_datetime: ''
  });

  const [customEventType, setCustomEventType] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await eventService.getEventById(id);
      const event = response.event;

      // Check if user is the organizer
      if (event.organizer_id !== user.id) {
        alert('You can only edit your own events');
        navigate('/my-events');
        return;
      }

      // Check if event can be edited
      if (event.status === 'completed' || event.status === 'cancelled') {
        alert('Cannot edit completed or cancelled events');
        navigate('/my-events');
        return;
      }

      // Check if event_type is a custom type
      const standardTypes = eventTypes.map(t => t.value);
      const isCustomType = !standardTypes.includes(event.event_type);

      setFormData({
        event_name: event.event_name,
        description: event.description || '',
        visibility: event.visibility,
        event_type: isCustomType ? 'other' : event.event_type,
        start_datetime: toDateTimeLocalInput(event.start_datetime),
        end_datetime: toDateTimeLocalInput(event.end_datetime)
      });

      if (isCustomType) {
        setCustomEventType(event.event_type);
      }

      setLoading(false);
    } catch (error) {
      alert(error || 'Failed to load event');
      navigate('/my-events');
    }
  }, [id, user.id, navigate]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.event_name.trim()) {
      newErrors.event_name = 'Event name is required';
    }

    if (formData.event_type === 'other' && !customEventType.trim()) {
      newErrors.custom_event_type = 'Please specify the event type';
    }

    if (!formData.start_datetime) {
      newErrors.start_datetime = 'Start date and time is required';
    }

    if (!formData.end_datetime) {
      newErrors.end_datetime = 'End date and time is required';
    }

    if (formData.start_datetime && formData.end_datetime) {
      const start = new Date(formData.start_datetime);
      const end = new Date(formData.end_datetime);
      
      if (end <= start) {
        newErrors.end_datetime = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const eventData = {
        ...formData,
        // Use custom event type if 'other' is selected
        event_type: formData.event_type === 'other' ? customEventType : formData.event_type,
        // Convert datetime-local input to ISO string (UTC)
        start_datetime: fromDateTimeLocalInput(formData.start_datetime),
        end_datetime: fromDateTimeLocalInput(formData.end_datetime)
      };

      await eventService.updateEvent(id, eventData);
      
      alert('Event updated successfully!');
      navigate('/my-events');
    } catch (error) {
      alert(error || 'Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All changes will be lost.')) {
      navigate('/my-events');
    }
  };

  if (loading) {
    return (
      <div className="create-event-container">
        <div className="loading">Loading event details...</div>
      </div>
    );
  }

  return (
    <div className="create-event-container">
      <div className="create-event-header">
        <div>
          <h1>Edit Event</h1>
          <p>Update event details</p>
        </div>
        <button onClick={() => navigate('/my-events')} className="back-button">
          Back to My Events
        </button>
      </div>

      <form onSubmit={handleSubmit} className="event-form">
        <div className="form-section">
          <h2>Basic Information</h2>
          
          <div className="form-group">
            <label htmlFor="event_name">
              Event Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="event_name"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              className={errors.event_name ? 'error' : ''}
              placeholder="Enter event name"
            />
            {errors.event_name && <span className="error-message">{errors.event_name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="event_type">
              Event Type <span className="required">*</span>
            </label>
            <select
              id="event_type"
              name="event_type"
              value={formData.event_type}
              onChange={handleChange}
              className={errors.event_type ? 'error' : ''}
            >
              {eventTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.event_type && <span className="error-message">{errors.event_type}</span>}
          </div>

          {formData.event_type === 'other' && (
            <div className="form-group">
              <label htmlFor="custom_event_type">
                Specify Event Type <span className="required">*</span>
              </label>
              <input
                type="text"
                id="custom_event_type"
                value={customEventType}
                onChange={(e) => setCustomEventType(e.target.value)}
                className={errors.custom_event_type ? 'error' : ''}
                placeholder="Enter custom event type"
              />
              {errors.custom_event_type && <span className="error-message">{errors.custom_event_type}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Enter event description (optional)"
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Date & Time</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_datetime">
                Start Date & Time <span className="required">*</span>
              </label>
              <input
                type="datetime-local"
                id="start_datetime"
                name="start_datetime"
                value={formData.start_datetime}
                onChange={handleChange}
                className={errors.start_datetime ? 'error' : ''}
              />
              {errors.start_datetime && <span className="error-message">{errors.start_datetime}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="end_datetime">
                End Date & Time <span className="required">*</span>
              </label>
              <input
                type="datetime-local"
                id="end_datetime"
                name="end_datetime"
                value={formData.end_datetime}
                onChange={handleChange}
                className={errors.end_datetime ? 'error' : ''}
              />
              {errors.end_datetime && <span className="error-message">{errors.end_datetime}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Visibility Settings</h2>
          
          {canChangeVisibility ? (
            <div className="form-group">
              <label htmlFor="visibility">
                Event Visibility <span className="required">*</span>
              </label>
              <select
                id="visibility"
                name="visibility"
                value={formData.visibility}
                onChange={handleChange}
              >
                {visibilityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="field-help">
                Choose who can see and register for this event
              </p>
            </div>
          ) : (
            <div className="visibility-locked">
              <div className="locked-info">
                <span className="lock-icon">🔒</span>
                <div>
                  <strong>Campus Wide</strong>
                  <p>Your events are visible to all logged-in users on campus.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="cancel-button"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={submitting}
          >
            {submitting ? 'Updating...' : 'Update Event'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditEventPage;
