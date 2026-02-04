import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
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
  const [venueBookings, setVenueBookings] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participationStatus, setParticipationStatus] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.id;
  const { showSuccess, showError } = useToast();
  
  // Check if user came from My Events page (management view)
  const isManagementView = location.state?.fromMyEvents;
  const fromEventsPage = location.state?.fromEventsPage;
  const fromHome = location.state?.fromHome;
  const fromCalendar = location.state?.fromCalendar;
  const eventFilter = location.state?.filter;

  const loadEventDetails = useCallback(async () => {
    document.title = 'Event Details - CESMS';
    try {
      setLoading(true);
      setError('');
      const data = await eventService.getEventById(id);
      setEvent(data.event);
      
      // Load participation status for all users
      try {
        console.log('[EventDetailsPage] Loading participation status for event:', id);
        const statusData = await participationService.getEventStatus(id);
        console.log('[EventDetailsPage] Participation status loaded:', statusData);
        setParticipationStatus(statusData);
      } catch (err) {
        console.error('[EventDetailsPage] Error loading participation status:', err);
      }
      
      const isCreator = userId && data.event.organizer_id === userId;
      
      // Load venue bookings for all users (not just creators)
      try {
        console.log('[EventDetailsPage] Loading venue bookings for event:', id);
        const bookingResponse = await venueBookingService.getBookingsByEvent(id);
        console.log('[EventDetailsPage] Venue booking response:', bookingResponse);
        const approvedBookings = bookingResponse.bookings?.filter(b => b.status === 'approved') || [];
        console.log('[EventDetailsPage] Approved venue bookings:', approvedBookings);
        setVenueBookings(approvedBookings);
      } catch (err) {
        console.error('[EventDetailsPage] Error loading venue bookings:', err);
      }
      
      // If user is the creator, also load resources
      if (isCreator) {
        try {
          const resourceResponse = await resourceRequestService.getByEvent(id);
          const approvedResources = resourceResponse.requests?.filter(r => r.status === 'approved') || [];
          setResources(approvedResources);
        } catch (err) {
          console.error('Error loading resources:', err);
        }
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
      
      // Check if user is already registered
      const statusData = await participationService.getEventStatus(id);
      if (statusData.isRegistered) {
        showError('You are already registered for this event');
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
        showSuccess('Registered successfully!');
        // Reload participation status
        const newStatusData = await participationService.getEventStatus(id);
        setParticipationStatus(newStatusData);
        setActionLoading(false);
      }
    } catch (err) {
      // Debug: Log the actual error to understand its structure
      console.log('[EventDetailsPage] Registration error:', err);
      console.log('[EventDetailsPage] Error type:', typeof err);
      console.log('[EventDetailsPage] Error string:', String(err));
      
      // Extract error message - handle both string and object errors
      let errorMessage;
      if (typeof err === 'string') {
        errorMessage = err;
      } else {
        errorMessage = err?.response?.data?.error || err?.message || 'Failed to register for event';
      }
      
      const errorLower = errorMessage.toLowerCase();
      
      // Display specific error messages
      if (errorLower.includes('full') || errorLower.includes('capacity')) {
        showError('🚫 Event is Full - Registration capacity has been reached.');
      } else if (errorLower.includes('conflict')) {
        showError('⚠️ Time Conflict - You have another event at the same time.');
      } else if (errorLower.includes('closed')) {
        showError('🔒 Registration Closed - This event is no longer accepting registrations.');
      } else if (errorLower.includes('completed') || errorLower.includes('cancelled')) {
        showError('❌ Cannot register for completed or cancelled events');
      } else if (errorLower.includes('already registered')) {
        showError('✓ You are already registered for this event.');
      } else {
        showError(errorMessage);
      }
      setActionLoading(false);
    }
  };

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    try {
      setActionLoading(true);
      await participationService.cancel(id);
      showSuccess('Registration cancelled successfully');
      // Reload participation status
      const statusData = await participationService.getEventStatus(id);
      setParticipationStatus(statusData);
      // Notify parent routes to refresh their data
      window.dispatchEvent(new Event('registration-cancelled'));
    } catch (err) {
      showError(err || 'Failed to cancel registration');
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    loadEventDetails();
  }, [loadEventDetails]);

  // Reload participation status when returning from registration form
  useEffect(() => {
    const reloadStatus = async () => {
      if (location.state?.registrationComplete) {
        console.log('[EventDetailsPage] Registration complete detected, reloading status');
        try {
          const statusData = await participationService.getEventStatus(id);
          console.log('[EventDetailsPage] Updated participation status:', statusData);
          setParticipationStatus(statusData);
          if (location.state?.message) {
            showSuccess('Registered successfully!');
          }
        } catch (err) {
          console.error('[EventDetailsPage] Error reloading participation status:', err);
        }
      }
    };
    reloadStatus();
  }, [location.state?.registrationComplete, location.state?.message, id, showSuccess]);

  const handleBackToEvents = () => {
    // Navigate back to the page user came from
    if (fromCalendar) {
      navigate('/my-calendar');
    } else if (fromHome) {
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
    if (role === 'faculty_staff' && faculty) {
      return `${faculty.code} Faculty Staff`;
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
          {fromCalendar ? 'Back to My Calendar' : (fromHome ? 'Back to Home' : (isManagementView ? 'Back to My Events' : 'Back to Events'))}
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-details-container">
        <div className="ed-error-message">Event not found</div>
        <button onClick={handleBackToEvents} className="ed-back-button">
          {fromCalendar ? 'Back to My Calendar' : (fromHome ? 'Back to Home' : (isManagementView ? 'Back to My Events' : 'Back to Events'))}
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
          {fromCalendar ? 'Back to My Calendar' : (fromHome ? 'Back to Home' : (isManagementView ? 'Back to My Events' : 'Back to Events'))}
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
                Registered
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

        {/* Display Venue if available */}
        {venueBookings.length > 0 && (
          <div className="ed-event-venue">
            <h3>Venue</h3>
            <div className="ed-venue-list">
              {venueBookings.map((booking) => (
                <div key={booking.id} className="ed-venue-item">
                  <p><strong>{booking.venue?.name || 'Venue'}</strong></p>
                  {booking.venue?.location && (
                    <p className="ed-venue-location">{booking.venue.location}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show created date only to event creator */}
        {isManagementView && (
          <div className="ed-event-meta">
            <p><strong>Created:</strong> {formatDateTime(event.created_at)}</p>
          </div>
        )}

        {/* Venue and Resources Section - Only for event creator */}
        {isManagementView && venueBookings.length > 0 && (() => {
          // Group venue bookings by package_id
          const venuePackages = {};
          const standaloneVenues = [];
          
          venueBookings.forEach(booking => {
            if (booking.package_id) {
              if (!venuePackages[booking.package_id]) {
                venuePackages[booking.package_id] = [];
              }
              venuePackages[booking.package_id].push(booking);
            } else {
              standaloneVenues.push(booking);
            }
          });
          
          return (
            <div className="ed-venue-section">
              <h3>Approved Venue Booking{venueBookings.length > 1 ? 's' : ''}</h3>
              
              {/* Display packages */}
              {Object.values(venuePackages).map((packageBookings, pkgIndex) => (
                <div key={`package-${pkgIndex}`} style={{
                  marginBottom: '20px'
                }}>
                  <div className="ed-resources-list">
                    {packageBookings.map((booking) => (
                      <div key={booking.id} className="ed-resource-item">
                        <p><strong>{booking.venue?.name || 'N/A'}</strong> ({booking.venue?.code || 'N/A'})</p>
                        <p>Location: {booking.venue?.location || 'N/A'}</p>
                        <p>Capacity: {booking.venue?.capacity || 'N/A'} people</p>
                        <p>Period: {formatDateTime(booking.requested_start_datetime)} - {formatDateTime(booking.requested_end_datetime)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Display standalone bookings */}
              {standaloneVenues.length > 0 && (
                <div className="ed-resources-list">
                  {standaloneVenues.map(booking => (
                    <div key={booking.id} className="ed-resource-item">
                      <p><strong>{booking.venue?.name || 'N/A'}</strong> ({booking.venue?.code || 'N/A'})</p>
                      <p>Location: {booking.venue?.location || 'N/A'}</p>
                      <p>Capacity: {booking.venue?.capacity || 'N/A'} people</p>
                      <p>Period: {formatDateTime(booking.requested_start_datetime)} - {formatDateTime(booking.requested_end_datetime)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

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

        {/* Participation Actions - Only show for non-invite-only events */}
        {event.visibility !== 'inviteonly' && !isManagementView && (event.status === 'upcoming' || event.status === 'ongoing') && currentUser?.role !== 'administrator' && event.organizer_id !== userId && (
          <div className="ed-participation-actions">
            {event.registration_status === 'closed' ? (
              <div className="ed-registration-closed">
                🔒 Registration Closed
              </div>
            ) : (participationStatus?.status === 'registered' || participationStatus?.isRegistered) ? (
              <button 
                onClick={handleCancelClick} 
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

        {/* Cancel Registration Confirmation Modal */}
        <ConfirmModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelConfirm}
          title="Cancel Registration"
          message="Are you sure you want to cancel your registration for this event?"
          confirmText="Yes, Cancel"
          cancelText="No, Keep Registration"
          danger={true}
        />
      </div>
    </div>
  );
}

export default EventDetailsPage;
