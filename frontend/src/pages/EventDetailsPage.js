import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import eventService from '../services/eventService';
import participationService from '../services/participationService';
import registrationFieldService from '../services/registrationFieldService';
import venueBookingService from '../services/venueBookingService';
import resourceRequestService from '../services/resourceRequestService';
import authService from '../services/authService';
import { formatDateTime } from '../utils/dateUtils';
import './EventDetailsPage.css';

function EventDetailsPage() {
  const [event, setEvent] = useState(null);
  const [venueBooking, setVenueBooking] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participationStatus, setParticipationStatus] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.id;
  
  // Check if user came from My Events page (management view)
  const isManagementView = location.state?.fromMyEvents;
  const fromEventsPage = location.state?.fromEventsPage;
  const fromHome = location.state?.fromHome;
  const eventFilter = location.state?.filter;

  const loadEventDetails = useCallback(async () => {
    document.title = 'Event Details - CESMS';
    try {
      setLoading(true);
      setError('');
      const data = await eventService.getEventById(id);
      setEvent(data.event);
      
      const isCreator = userId && data.event.organizer_id === userId;
      
      // If user is the creator, load venue booking and resources
      if (isCreator) {
        try {
          const bookingResponse = await venueBookingService.getBookingsByEvent(id);
          const approvedBooking = bookingResponse.bookings?.find(b => b.status === 'approved');
          if (approvedBooking) {
            setVenueBooking(approvedBooking);
          }
        } catch (err) {
          console.error('Error loading venue booking:', err);
        }
        
        try {
          const resourceResponse = await resourceRequestService.getByEvent(id);
          const approvedResources = resourceResponse.requests?.filter(r => r.status === 'approved') || [];
          setResources(approvedResources);
        } catch (err) {
          console.error('Error loading resources:', err);
        }
      }
      
      // Load participation status
      try {
        const statusData = await participationService.getEventStatus(id);
        setParticipationStatus(statusData);
      } catch (err) {
        console.error('Error loading participation status:', err);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    loadEventDetails();
  }, [loadEventDetails]);

  const handleRegister = async () => {
    try {
      setActionLoading(true);
      setActionMessage('');
      
      // Check if user is already registered
      const statusData = await participationService.getEventStatus(id);
      if (statusData.isRegistered) {
        setActionMessage('You are already registered for this event');
        setActionLoading(false);
        return;
      }
      
      // Check if there are custom registration fields FIRST
      const fieldsData = await registrationFieldService.getPublicEventFields(id);
      
      if (fieldsData.fields && fieldsData.fields.length > 0) {
        // Navigate to custom registration form WITHOUT creating participation yet
        navigate(`/events/${id}/register-form`, {
          state: { requiresRegistration: true }
        });
      } else {
        // No custom fields, create participation immediately
        await participationService.register(id);
        setActionMessage('Successfully registered for event!');
        // Reload participation status
        const newStatusData = await participationService.getEventStatus(id);
        setParticipationStatus(newStatusData);
      }
    } catch (err) {
      // Check if event is full
      if (err && typeof err === 'string' && err.toLowerCase().includes('full')) {
        setActionMessage('This event is full. Registration capacity has been reached.');
      } else {
      setActionMessage(err);
      }
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your registration?')) {
      return;
    }
    
    try {
      setActionLoading(true);
      setActionMessage('');
      await participationService.cancel(id);
      setActionMessage('Registration cancelled successfully');
      // Reload participation status
      const statusData = await participationService.getEventStatus(id);
      setParticipationStatus(statusData);
    } catch (err) {
      setActionMessage(err);
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    loadEventDetails();
  }, [loadEventDetails]);

  const handleBackToEvents = () => {
    // Navigate back to the page user came from
    if (fromHome) {
      navigate('/home');
    } else if (isManagementView) {
      navigate('/my-events');
    } else if (fromEventsPage && eventFilter) {
      navigate('/events', { state: { filter: eventFilter } });
    } else {
      navigate('/events');
    }
  };

  const calculateDuration = (start, end) => {
    const diff = new Date(end) - new Date(start);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    
    return parts.join(', ');
  };

  const formatVisibility = (visibility, organizerFaculty) => {
    if (visibility === 'facultyonly' && organizerFaculty) {
      return `${organizerFaculty.code} only`;
    }
    if (visibility === 'campuswide') {
      return 'Campus-Wide';
    }
    if (visibility === 'inviteonly') {
      return 'Invite Only';
    }
    return visibility;
  };

  const formatRole = (role, faculty) => {
    if (role === 'faculty_manager' && faculty) {
      return `${faculty.code} Faculty Manager`;
    }
    if (role === 'event_organizer') {
      return 'Event Organizer';
    }
    if (role === 'administrator') {
      return 'Administrator';
    }
    if (role === 'student' && faculty) {
      return `${faculty.code} Student`;
    }
    return role;
  };

  if (loading) {
    return (
      <div className="event-details-container">
        <div className="ed-loading">Loading event details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="event-details-container">
        <div className="ed-error-message">{error}</div>
        <button onClick={handleBackToEvents} className="ed-back-button">
          {fromHome ? 'Back to Home' : (isManagementView ? 'Back to My Events' : 'Back to Events')}
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-details-container">
        <div className="ed-error-message">Event not found</div>
        <button onClick={handleBackToEvents} className="ed-back-button">
          {fromHome ? 'Back to Home' : (isManagementView ? 'Back to My Events' : 'Back to Events')}
        </button>
      </div>
    );
  }

  return (
    <div className="event-details-container">
      <div className="event-details-header">
        <div>
          <h1>Event Details</h1>
          <p>View event information and manage your registration</p>
        </div>
        <button onClick={handleBackToEvents} className="ed-back-button">
          {fromHome ? 'Back to Home' : (isManagementView ? 'Back to My Events' : 'Back to Events')}
        </button>
      </div>

      <div className="event-details-content">
        <div className="ed-event-header">
          <h1>{event.event_name}</h1>
          <div className="ed-event-header-badges">
            <span className={`ed-status-badge ed-status-${event.status}`}>
              {event.status}
            </span>
            {participationStatus?.isRegistered && (
              <span className="ed-status-badge ed-status-registered">
                ✓ Registered
              </span>
            )}
          </div>
        </div>

        <div className="ed-event-info-grid">
          <div className="ed-info-section">
            <h3>Event Type</h3>
            <p className="ed-capitalize">{event.event_type || 'General Event'}</p>
          </div>

          <div className="ed-info-section">
            <h3>Visibility</h3>
            <p className="ed-capitalize">{formatVisibility(event.visibility, event.organizer?.faculty)}</p>
          </div>

          <div className="ed-info-section">
            <h3>Duration</h3>
            <p>{calculateDuration(event.start_datetime, event.end_datetime)}</p>
          </div>

          <div className="ed-info-section">
            <h3>Organizer</h3>
            <div className="ed-organizer-info">
              <span>{event.organizer?.name || event.organizer?.email || 'Unknown'}</span>
              <span className="ed-role-badge">{formatRole(event.organizer?.role, event.organizer?.faculty)}</span>
            </div>
          </div>

          {participationStatus && (participationStatus.registeredCount !== undefined || participationStatus.capacityLimit) && (
            <div className="ed-info-section">
              <h3>Participants</h3>
              <p>
                {participationStatus.registeredCount || 0}
                {participationStatus.capacityLimit && ` / ${participationStatus.capacityLimit}`}
                {participationStatus.isFull && <span className="ed-full-badge"> (FULL)</span>}
              </p>
            </div>
          )}
        </div>

        <div className="ed-event-description-section">
          <h3>Description</h3>
          <p>{event.description || 'No description provided.'}</p>
        </div>

        <div className="ed-event-schedule">
          <h3>Schedule</h3>
          <div className="ed-schedule-item">
            <strong>Start:</strong>
            <span>{formatDateTime(event.start_datetime)}</span>
          </div>
          <div className="ed-schedule-item">
            <strong>End:</strong>
            <span>{formatDateTime(event.end_datetime)}</span>
          </div>
        </div>

        {/* Show created date only to event creator */}
        {isManagementView && (
          <div className="ed-event-meta">
            <p><strong>Created:</strong> {formatDateTime(event.created_at)}</p>
          </div>
        )}

        {/* Venue and Resources Section - Only for event creator */}
        {isManagementView && venueBooking && (
          <div className="ed-venue-section">
            <h3>Approved Venue Booking</h3>
            <div className="ed-venue-details">
              <p><strong>Venue:</strong> {venueBooking.venue?.name || 'N/A'} ({venueBooking.venue?.code || 'N/A'})</p>
              <p><strong>Location:</strong> {venueBooking.venue?.location || 'N/A'}</p>
              <p><strong>Capacity:</strong> {venueBooking.venue?.capacity || 'N/A'} people</p>
              <p><strong>Period:</strong> {formatDateTime(venueBooking.requested_start_datetime)} - {formatDateTime(venueBooking.requested_end_datetime)}</p>
            </div>
          </div>
        )}

        {isManagementView && resources.length > 0 && (
          <div className="ed-resources-section">
            <h3>Approved Resources</h3>
            <div className="ed-resources-list">
              {resources.map((resource) => (
                <div key={resource.id} className="ed-resource-item">
                  <p><strong>{resource.resource?.name || 'N/A'}</strong></p>
                  <p>Quantity: {resource.requested_quantity} {resource.resource?.unit || 'units'}</p>
                  <p>Category: {resource.resource?.category?.name || 'N/A'}</p>
                  <p>Period: {formatDateTime(resource.usage_start_datetime)} - {formatDateTime(resource.usage_end_datetime)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participation Actions - Only show if NOT in management view, NOT from home, and NOT administrator */}
        {!isManagementView && !fromHome && (event.status === 'upcoming' || event.status === 'ongoing') && currentUser?.role !== 'administrator' && (
          <div className="ed-participation-actions">
            {actionMessage && (
              <div className={`ed-action-message ${actionMessage.includes('Success') || actionMessage.includes('cancel') ? 'ed-success' : 'ed-error'}`}>
                {actionMessage}
              </div>
            )}

            {participationStatus?.status === 'registered' ? (
              <button 
                onClick={handleCancel} 
                disabled={actionLoading}
                className="ed-cancel-button"
              >
                {actionLoading ? 'Processing...' : 'Cancel Registration'}
              </button>
            ) : (
              <button 
                onClick={handleRegister} 
                disabled={actionLoading}
                className="ed-register-button"
              >
                {actionLoading ? 'Processing...' : 'Register for Event'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventDetailsPage;
