import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import eventService from '../services/eventService';
import authService from '../services/authService';
import venueBookingService from '../services/venueBookingService';
import { formatDateTime } from '../utils/dateUtils';
import './MyEventsPage.css';

function MyEventsPage() {
  const [events, setEvents] = useState([]);
  const [eventBookings, setEventBookings] = useState({}); // Track venue bookings by event ID
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getCurrentUser();

  const loadMyEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await eventService.getAllEvents();
      
      // Filter events created by current user
      let myEvents = data.events.filter(e => e.organizer_id === user.id);
      
      // Store total count before applying filter
      setTotalEvents(myEvents.length);
      
      // Apply status filter
      if (filter !== 'all') {
        myEvents = myEvents.filter(e => e.status === filter);
      }
      
      setEvents(myEvents);

      // Fetch venue bookings for each event
      const bookingsMap = {};
      await Promise.all(
        myEvents.map(async (event) => {
          try {
            const response = await venueBookingService.getBookingsByEvent(event.id);
            const approvedBooking = response.bookings?.find(b => b.status === 'approved');
            if (approvedBooking) {
              bookingsMap[event.id] = approvedBooking;
            }
          } catch (err) {
            // Silently fail for individual booking fetches
            console.error(`Failed to fetch bookings for event ${event.id}:`, err);
          }
        })
      );
      setEventBookings(bookingsMap);
    } catch (err) {
      setError(err || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [filter, user.id]);

  useEffect(() => {
    loadMyEvents();
    
    // Check for success message from navigation
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
      // Clear the state to prevent showing message on refresh
      window.history.replaceState({}, document.title);
    }
  }, [filter, location, loadMyEvents]);

  const handleEditEvent = (eventId) => {
    navigate(`/events/${eventId}/edit`);
  };

  const handleViewEvent = (eventId) => {
    navigate(`/events/${eventId}`, { state: { fromMyEvents: true } });
  };

  const handleDeleteEvent = async (eventId, eventName) => {
    if (!window.confirm(`Are you sure you want to delete "${eventName}"?`)) {
      return;
    }

    try {
      await eventService.deleteEvent(eventId);
      setEvents(events.filter(e => e.id !== eventId));
      alert('Event deleted successfully');
    } catch (err) {
      alert(err || 'Failed to delete event');
    }
  };

  const handleCreateEvent = () => {
    navigate('/create-event', { state: { from: 'my-events' } });
  };

  const handleBookVenue = async (event) => {
    try {
      // Check if user already has an active booking for this event
      const response = await venueBookingService.getBookingsByEvent(event.id);
      const existingBookings = response.bookings || [];
      
      // Filter for active bookings only (pending or approved)
      const activeBooking = existingBookings.find(b => 
        b.status === 'pending' || b.status === 'approved'
      );
      
      // If there's an active booking, navigate to its details page
      if (activeBooking) {
        navigate(`/venue-bookings/${activeBooking.id}`);
      } else {
        // No active booking, proceed to booking form
        navigate('/venue-booking', { state: { event } });
      }
    } catch (err) {
      console.error('Error checking existing bookings:', err);
      // If error, still allow them to proceed to booking page
      navigate('/venue-booking', { state: { event } });
    }
  };

  const handleRequestResources = (event) => {
    const booking = eventBookings[event.id];
    if (booking) {
      navigate('/request-resources', { state: { event, venueBooking: booking } });
    }
  };

  const formatVisibility = (visibility) => {
    if (visibility === 'campuswide') return 'Campus-Wide';
    if (visibility === 'facultyonly') return 'Faculty Only';
    if (visibility === 'inviteonly') return 'Invite Only';
    return visibility;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'upcoming':
        return 'status-upcoming';
      case 'ongoing':
        return 'status-ongoing';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  return (
    <div className="my-events-container">
      <div className="my-events-header">
        <div>
          <h1>My Events</h1>
          <p>Manage events you've created</p>
        </div>
        <div className="header-actions">
          <button onClick={handleCreateEvent} className="create-button">
            ➕ Create New Event
          </button>
          <button onClick={() => navigate('/home')} className="back-button">
            Back to Home
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="success-notification">
          ✅ {successMessage}
        </div>
      )}

      <div className="filter-section">
        <label>Filter by status: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Events</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading your events...</div>
      ) : events.length === 0 ? (
        <div className="no-events">
          {totalEvents === 0 ? (
            <>
              <p>You haven't created any events yet.</p>
              <button onClick={handleCreateEvent} className="create-button-large">
                Create Your First Event
              </button>
            </>
          ) : (
            <p>No {filter} events found.</p>
          )}
        </div>
      ) : (
        <>
          <div className="events-count">
            Showing {events.length} event{events.length !== 1 ? 's' : ''}
          </div>
          <div className="events-table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Visibility</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="event-name-cell">
                      <div className="event-name">{event.event_name}</div>
                      {event.description && (
                        <div className="event-description-preview">
                          {event.description.substring(0, 60)}
                          {event.description.length > 60 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="event-type-badge">
                        {event.event_type || 'General'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(event.status)}`}>
                        {event.status}
                      </span>
                    </td>
                    <td>
                      <span className="visibility-badge">
                        {formatVisibility(event.visibility)}
                      </span>
                    </td>
                    <td>{formatDateTime(event.start_datetime)}</td>
                    <td>{formatDateTime(event.end_datetime)}</td>
                    <td className="actions-cell">
                      <button 
                        onClick={() => handleViewEvent(event.id)}
                        className="action-button view-button"
                        title="View Details"
                      >
                        👁️
                      </button>
                      <button 
                        onClick={() => handleBookVenue(event)}
                        className="action-button book-button"
                        title="Book Venue"
                      >
                        📍
                      </button>
                      {eventBookings[event.id] && (
                        <button 
                          onClick={() => handleRequestResources(event)}
                          className="action-button resource-button"
                          title="Request Resources"
                        >
                          📦
                        </button>
                      )}
                      <button 
                        onClick={() => handleEditEvent(event.id)}
                        className="action-button edit-button"
                        title="Edit Event"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteEvent(event.id, event.event_name)}
                        className="action-button delete-button"
                        title="Delete Event"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default MyEventsPage;
