import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import eventService from '../services/eventService';
import authService from '../services/authService';
import { fromDateTimeLocalInput } from '../utils/dateUtils';
import './CreateEventPage.css';

function CreateEventPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getCurrentUser();

  // Set page title
  React.useEffect(() => {
    document.title = 'Create Event - CESMS';
  }, []);

  // Check if user can change visibility (only event_organizer and administrator)
  const canChangeVisibility = user.role === 'event_organizer' || user.role === 'administrator';

  const [formData, setFormData] = useState({
    event_name: '',
    description: '',
    visibility: 'campuswide', // Default for all users
    event_type: 'seminar',
    start_datetime: '',
    end_datetime: ''
  });

  const [customEventType, setCustomEventType] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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
        newErrors.end_datetime = 'End date must be after start date';
      }

      // Check if start date is in the past
      if (start < new Date()) {
        newErrors.start_datetime = 'Start date cannot be in the past';
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
        organizer_id: user.id,
        status: 'upcoming',
        // Convert datetime-local input to ISO string (UTC)
        start_datetime: fromDateTimeLocalInput(formData.start_datetime),
        end_datetime: fromDateTimeLocalInput(formData.end_datetime)
      };

      const result = await eventService.createEvent(eventData);
      
      alert('Event created successfully!');
      navigate(`/events/${result.event.id}`);
    } catch (error) {
      alert(error || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All changes will be lost.')) {
      // Navigate back to where user came from
      const fromPage = location.state?.from;
      if (fromPage === 'home') {
        navigate('/home');
      } else {
        navigate('/my-events');
      }
    }
  };

  return (
    <div className="create-event-container">
      <div className="create-event-header">
        <div>
          <h1>Create New Event</h1>
          <p>Fill in the details to organize a new campus event</p>
        </div>
        <button 
          onClick={() => {
            const fromPage = location.state?.from;
            navigate(fromPage === 'home' ? '/home' : '/my-events');
          }} 
          className="ce-back-button"
        >
          {location.state?.from === 'home' ? 'Back to Home' : 'Back to My Events'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="ce-event-form">
        <div className="ce-form-section">
          <h2>Basic Information</h2>
          
          <div className="ce-form-group">
            <label htmlFor="event_name">
              Event Name <span className="ce-required">*</span>
            </label>
            <input
              type="text"
              id="event_name"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              className={errors.event_name ? 'ce-error' : ''}
              placeholder="Enter event name"
            />
            {errors.event_name && (
              <span className="ce-error-message">{errors.event_name}</span>
            )}
          </div>

          <div className="ce-form-group">
            <label htmlFor="event_type">Event Type</label>
            <select
              id="event_type"
              name="event_type"
              value={formData.event_type}
              onChange={handleChange}
            >
              {eventTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {formData.event_type === 'other' && (
            <div className="ce-form-group">
              <label htmlFor="custom_event_type">
                Specify Event Type <span className="ce-required">*</span>
              </label>
              <input
                type="text"
                id="custom_event_type"
                value={customEventType}
                onChange={(e) => setCustomEventType(e.target.value)}
                className={errors.custom_event_type ? 'ce-error' : ''}
                placeholder="e.g., Hackathon, Blood Donation, Charity Drive"
              />
              {errors.custom_event_type && (
                <span className="ce-error-message">{errors.custom_event_type}</span>
              )}
            </div>
          )}

          <div className="ce-form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="5"
              placeholder="Describe your event, what participants can expect, agenda, etc."
            />
            <span className="ce-helper-text">
              {formData.description.length} characters
            </span>
          </div>
        </div>

        <div className="ce-form-section">
          <h2>Date & Time</h2>
          
          <div className="ce-form-row">
            <div className="ce-form-group">
              <label htmlFor="start_datetime">
                Start Date & Time <span className="ce-required">*</span>
              </label>
              <input
                type="datetime-local"
                id="start_datetime"
                name="start_datetime"
                value={formData.start_datetime}
                onChange={handleChange}
                className={errors.start_datetime ? 'ce-error' : ''}
              />
              {errors.start_datetime && (
                <span className="ce-error-message">{errors.start_datetime}</span>
              )}
            </div>

            <div className="ce-form-group">
              <label htmlFor="end_datetime">
                End Date & Time <span className="ce-required">*</span>
              </label>
              <input
                type="datetime-local"
                id="end_datetime"
                name="end_datetime"
                value={formData.end_datetime}
                onChange={handleChange}
                className={errors.end_datetime ? 'ce-error' : ''}
              />
              {errors.end_datetime && (
                <span className="ce-error-message">{errors.end_datetime}</span>
              )}
            </div>
          </div>
        </div>

        <div className="ce-form-section">
          <h2>Visibility Settings</h2>
          
          {canChangeVisibility ? (
            <div className="ce-form-group">
              <label htmlFor="visibility">Who can see this event?</label>
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
              <span className="ce-helper-text">
                {formData.visibility === 'campuswide' && 'All logged-in users will see this event'}
                {formData.visibility === 'facultyonly' && 'Only members of your faculty can see this event'}
                {formData.visibility === 'inviteonly' && 'Only users you invite will see this event'}
              </span>
            </div>
          ) : (
            <div className="ce-visibility-locked">
              <div className="ce-locked-info">
                <span className="ce-lock-icon">🔒</span>
                <div>
                  <strong>Campus Wide</strong>
                  <p>Your events are visible to all logged-in users on campus.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ce-form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="ce-cancel-button"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ce-submit-button"
            disabled={submitting}
          >
            {submitting ? 'Creating Event...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateEventPage;
