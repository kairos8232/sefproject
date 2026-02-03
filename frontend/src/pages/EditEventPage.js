import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import eventService from '../services/eventService';
import authService from '../services/authService';
import { authFetch } from '../services/apiClient';
import { toDateTimeLocalInput, fromDateTimeLocalInput } from '../utils/dateUtils';
import { useToast } from '../contexts/ToastContext';
import './EditEventPage.css';

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
  const { showSuccess, showError } = useToast();

  // Check if user can change visibility (only event_organizer and administrator)
  const canChangeVisibility = user.role === 'event_organizer' || user.role === 'administrator';
  
  // Check if user has a faculty (can only use Faculty Only visibility if they do)
  const userHasFaculty = user.faculty_id != null;
  
  // Filter visibility options based on user's faculty
  const availableVisibilityOptions = visibilityOptions.filter(option => {
    // Always allow Campus Wide and Invite Only
    if (option.value === 'campuswide' || option.value === 'inviteonly') {
      return true;
    }
    // Only allow Faculty Only if user has a faculty
    if (option.value === 'facultyonly') {
      return userHasFaculty;
    }
    return true;
  });

  const [formData, setFormData] = useState({
    event_name: '',
    description: '',
    visibility: 'campuswide',
    event_type: 'seminar',
    expected_attendees: '',
    registration_limit: '',
    start_datetime: '',
    end_datetime: ''
  });

  const [customEventType, setCustomEventType] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasApprovedBookings, setHasApprovedBookings] = useState(false);

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await eventService.getEventById(id);
      const event = response.event;

      // Check if user is the organizer
      if (event.organizer_id !== user.id) {
        showError('You can only edit your own events');
        navigate('/my-events');
        return;
      }

      // Check if event can be edited
      if (event.status === 'completed' || event.status === 'cancelled') {
        showError('Cannot edit completed or cancelled events');
        navigate('/my-events');
        return;
      }

      // Check for approved/pending venue bookings and resource requests
      try {
        // Check venue bookings
        const venueBResponse = await authFetch(`/venue-bookings/event/${id}`);
        const venueBData = await venueBResponse.json();
        const hasBlockedVenueBookings = venueBData.bookings?.some(
          b => b.status === 'approved' || b.status === 'pending'
        );

        // Check resource requests
        const resourceRResponse = await authFetch(`/resource-requests/event/${id}`);
        const resourceRData = await resourceRResponse.json();
        const hasBlockedResourceRequests = resourceRData.requests?.some(
          r => r.status === 'approved' || r.status === 'pending'
        );

        if (hasBlockedVenueBookings || hasBlockedResourceRequests) {
          setHasApprovedBookings(true);
          
          const blockedItems = [];
          if (hasBlockedVenueBookings) blockedItems.push('venue booking');
          if (hasBlockedResourceRequests) blockedItems.push('resource request');
        }
      } catch (error) {
        console.error('Error checking bookings/requests:', error);
        // Continue even if this check fails
      }

      // Check if event_type is a custom type
      const standardTypes = eventTypes.map(t => t.value);
      const isCustomType = !standardTypes.includes(event.event_type);

      // If event visibility is 'facultyonly' but user has no faculty, reset to 'campuswide'
      let eventVisibility = event.visibility;
      if (event.visibility === 'facultyonly' && !userHasFaculty) {
        eventVisibility = 'campuswide';
      }

      setFormData({
        event_name: event.event_name,
        description: event.description || '',
        visibility: eventVisibility,
        event_type: isCustomType ? 'other' : event.event_type,
        expected_attendees: event.expected_attendees || '',
        registration_limit: event.registration_limit || '',
        start_datetime: toDateTimeLocalInput(event.start_datetime),
        end_datetime: toDateTimeLocalInput(event.end_datetime)
      });

      if (isCustomType) {
        setCustomEventType(event.event_type);
      }

      setLoading(false);
    } catch (error) {
      showError(error || 'Failed to load event');
      navigate('/my-events');
    }
  }, [id, user.id, userHasFaculty, navigate, showError]);

  useEffect(() => {
    document.title = 'Edit Event - CESMS';
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
      showError('Please fix the errors in the form');
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
      
      showSuccess('Event updated successfully!');
      navigate('/my-events');
    } catch (error) {
      showError(error || 'Failed to update event');
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
    <div className="edit-event-container">
      <div className="edit-event-header">
        <div>
          <h1>Edit Event</h1>
          <p>Update event details</p>
        </div>
        <button onClick={() => navigate('/my-events')} className="back-button">
          Back to My Events
        </button>
      </div>

      <form onSubmit={handleSubmit} className="ee-event-form">
        <div className="ee-form-section">
          <h2>Basic Information</h2>
          
          <div className="ee-form-group">
            <label htmlFor="event_name">
              Event Name <span className="ee-required">*</span>
            </label>
            <input
              type="text"
              id="event_name"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              className={errors.event_name ? 'ee-error' : ''}
              placeholder="Enter event name"
            />
            {errors.event_name && <span className="ee-error-message">{errors.event_name}</span>}
          </div>

          <div className="ee-form-group">
            <label htmlFor="event_type">
              Event Type <span className="ee-required">*</span>
            </label>
            <select
              id="event_type"
              name="event_type"
              value={formData.event_type}
              onChange={handleChange}
              className={errors.event_type ? 'ee-error' : ''}
            >
              {eventTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.event_type && <span className="ee-error-message">{errors.event_type}</span>}
          </div>

          {formData.event_type === 'other' && (
            <div className="ee-form-group">
              <label htmlFor="custom_event_type">
                Specify Event Type <span className="ee-required">*</span>
              </label>
              <input
                type="text"
                id="custom_event_type"
                value={customEventType}
                onChange={(e) => setCustomEventType(e.target.value)}
                className={errors.custom_event_type ? 'ee-error' : ''}
                placeholder="Enter custom event type"
              />
              {errors.custom_event_type && <span className="ee-error-message">{errors.custom_event_type}</span>}
            </div>
          )}

          <div className="ee-form-group">
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

        <div className="ee-form-section">
          <h2>Date & Time</h2>       
          <div className="ee-form-row">
            <div className="ee-form-group">
              <label htmlFor="start_datetime">
                Start Date & Time <span className="ee-required">*</span>
              </label>
              <input
                type="datetime-local"
                id="start_datetime"
                name="start_datetime"
                value={formData.start_datetime}
                onChange={handleChange}
                disabled={hasApprovedBookings}
                title={hasApprovedBookings ? 'Cannot modify: pending or approved booking/request exists' : ''}
                className={errors.start_datetime ? 'ee-error' : ''}
                style={hasApprovedBookings ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              />
              {errors.start_datetime && <span className="ee-error-message">{errors.start_datetime}</span>}
              {hasApprovedBookings && (
                <span style={{ fontSize: '12px', color: '#856404', marginTop: '4px', display: 'block' }}>
                  This field is locked due to pending or approved bookings.
                </span>
              )}
            </div>

            <div className="ee-form-group">
              <label htmlFor="end_datetime">
                End Date & Time <span className="ee-required">*</span>
              </label>
              <input
                type="datetime-local"
                id="end_datetime"
                name="end_datetime"
                value={formData.end_datetime}
                onChange={handleChange}
                disabled={hasApprovedBookings}
                title={hasApprovedBookings ? 'Cannot modify: pending or approved booking/request exists' : ''}
                className={errors.end_datetime ? 'ee-error' : ''}
                style={hasApprovedBookings ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              />
              {errors.end_datetime && <span className="ee-error-message">{errors.end_datetime}</span>}
              {hasApprovedBookings && (
                <span style={{ fontSize: '12px', color: '#856404', marginTop: '4px', display: 'block' }}>
                  This field is locked due to pending or approved bookings.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="ee-form-section">
          <h2>Registration Settings</h2>
          
          <div className="ee-form-row">
            <div className="ee-form-group">
              <label htmlFor="expected_attendees">Expected Attendees *</label>
              <input
                type="number"
                id="expected_attendees"
                name="expected_attendees"
                value={formData.expected_attendees}
                onChange={handleChange}
                disabled={hasApprovedBookings}
                title={hasApprovedBookings ? 'Cannot modify: pending or approved booking/request exists' : ''}
                min="1"
                required
                placeholder="Enter expected number of attendees"
                style={hasApprovedBookings ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              />
              <span className="ee-helper-text">
                This helps filter suitable venues when booking. Required for venue booking.
              </span>
              {hasApprovedBookings && (
                <span style={{ fontSize: '12px', color: '#856404', marginTop: '4px', display: 'block' }}>
                  This field is locked due to pending or approved bookings.
                </span>
              )}
            </div>

            {formData.visibility !== 'inviteonly' && (
              <div className="ee-form-group">
                <label htmlFor="registration_limit">Registration Limit (Optional)</label>
                <input
                  type="number"
                  id="registration_limit"
                  name="registration_limit"
                  value={formData.registration_limit}
                  onChange={handleChange}
                  disabled={hasApprovedBookings}
                  title={hasApprovedBookings ? 'Cannot modify: pending or approved booking/request exists' : ''}
                  min="1"
                  placeholder="Leave empty to use venue capacity"
                  style={hasApprovedBookings ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                />
                <span className="ee-helper-text">
                  Maximum number of participants allowed to register. If left empty, the system will use the venue's capacity from your booking request.
                </span>
                {hasApprovedBookings && (
                  <span style={{ fontSize: '12px', color: '#856404', marginTop: '4px', display: 'block' }}>
                    This field is locked due to pending or approved bookings.
                  </span>
                )}
              </div>
            )}
            
            {formData.visibility === 'inviteonly' && (
              <div className="ee-form-group">
                <div className="ee-locked-info" style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                  <span style={{ fontSize: '20px', marginRight: '10px' }}>✉️</span>
                  <div>
                    <strong>Invite-Only Event</strong>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>Registration is controlled through invitations. No public registration limit needed.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ee-form-section">
          <h2>Visibility Settings</h2>
          
          {canChangeVisibility ? (
            <div className="ee-form-group">
              <label htmlFor="visibility">
                Event Visibility <span className="ee-required">*</span>
              </label>
              <select
                id="visibility"
                name="visibility"
                value={formData.visibility}
                onChange={handleChange}
              >
                {availableVisibilityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="ee-helper-text">
                Choose who can see and register for this event
              </span>
            </div>
          ) : (
            <div className="ee-visibility-locked">
              <div className="ee-locked-info">
                <span className="ee-lock-icon">🔒</span>
                <div>
                  <strong>Campus Wide</strong>
                  <p>Your events are visible to all logged-in users on campus.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ee-form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="ee-cancel-button"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ee-submit-button"
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
