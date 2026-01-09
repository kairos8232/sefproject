import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import eventService from '../services/eventService';
import authService from '../services/authService';
import venueBookingService from '../services/venueBookingService';
import resourceRequestService from '../services/resourceRequestService';
import { formatDateTime } from '../utils/dateUtils';
import './MyEventsPage.css';

function MyEventsPage() {
  const [events, setEvents] = useState([]);
  const [eventBookings, setEventBookings] = useState({}); // Track venue bookings by event ID
  const [eventResources, setEventResources] = useState({}); // Track resource requests by event ID
  const [totalEvents, setTotalEvents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getCurrentUser();
  const userId = user?.id; // Extract primitive to prevent re-renders

  // Check authentication
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  // Check if attendance recording is available (1 hour before start until end time)
  const isAttendanceAvailable = (event) => {
    const now = new Date();
    const startTime = new Date(event.start_datetime);
    const endTime = new Date(event.end_datetime);
    const oneHourBeforeStart = new Date(startTime.getTime() - 60 * 60 * 1000);
    
    return now >= oneHourBeforeStart && now <= endTime;
  };

  const loadMyEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!userId) {
        navigate('/login');
        return;
      }
      
      const data = await eventService.getAllEvents();
      
      // Filter events created by current user
      let myEvents = data.events.filter(e => e.organizer_id === userId);
      
      // Store total count before applying filter
      setTotalEvents(myEvents.length);
      
      // Apply search filter (event name)
      if (searchQuery.trim()) {
        myEvents = myEvents.filter(e => 
          e.event_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Apply status filter
      if (filter !== 'all') {
        myEvents = myEvents.filter(e => e.status === filter);
      }
      
      // Apply event type filter
      if (typeFilter !== 'all') {
        myEvents = myEvents.filter(e => e.event_type === typeFilter);
      }
      
      // Apply visibility filter
      if (visibilityFilter !== 'all') {
        myEvents = myEvents.filter(e => e.visibility === visibilityFilter);
      }
      
      // Apply period filter (based on event start and end dates)
      if (periodFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        // Calendar month boundaries
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        if (periodFilter === 'today') {
          // Events happening today (including multi-day events)
          myEvents = myEvents.filter(e => {
            const start = new Date(e.start_datetime);
            const end = new Date(e.end_datetime);
            // Event is happening today if it started before or on today AND ends on or after today
            return start <= todayEnd && end >= today;
          });
        } else if (periodFilter === 'this-week') {
          // Events happening within this week (including multi-day events)
          myEvents = myEvents.filter(e => {
            const start = new Date(e.start_datetime);
            const end = new Date(e.end_datetime);
            // Event overlaps with this week if it starts before week end AND ends on or after today
            return start < weekEnd && end >= today;
          });
        } else if (periodFilter === 'this-month') {
          // Events happening within the current calendar month (including multi-day events)
          myEvents = myEvents.filter(e => {
            const start = new Date(e.start_datetime);
            const end = new Date(e.end_datetime);
            // Event overlaps with this month if it starts before month end AND ends on or after month start
            return start <= monthEnd && end >= monthStart;
          });
        } else if (periodFilter === 'custom') {
          // Custom date range filter
          if (customStartDate || customEndDate) {
            myEvents = myEvents.filter(e => {
              const eventStart = new Date(e.start_datetime);
              const eventEnd = new Date(e.end_datetime);
              
              if (customStartDate && customEndDate) {
                const rangeStart = new Date(customStartDate);
                const rangeEnd = new Date(customEndDate);
                rangeEnd.setHours(23, 59, 59, 999);
                // Event overlaps with custom range
                return eventStart <= rangeEnd && eventEnd >= rangeStart;
              } else if (customStartDate) {
                const rangeStart = new Date(customStartDate);
                // Event ends on or after start date
                return eventEnd >= rangeStart;
              } else if (customEndDate) {
                const rangeEnd = new Date(customEndDate);
                rangeEnd.setHours(23, 59, 59, 999);
                // Event starts on or before end date
                return eventStart <= rangeEnd;
              }
              return true;
            });
          }
        }
      }
      
      setEvents(myEvents);

      // Fetch venue bookings and resource requests for each event
      const bookingsMap = {};
      const resourcesMap = {};
      await Promise.all(
        myEvents.map(async (event) => {
          try {
            // Fetch venue bookings
            const bookingResponse = await venueBookingService.getBookingsByEvent(event.id);
            const approvedBooking = bookingResponse.bookings?.find(b => b.status === 'approved');
            if (approvedBooking) {
              bookingsMap[event.id] = approvedBooking;
            }
            
            // Fetch resource requests
            const resourceResponse = await resourceRequestService.getByEvent(event.id);
            const approvedResources = resourceResponse.requests?.filter(r => r.status === 'approved') || [];
            if (approvedResources.length > 0) {
              resourcesMap[event.id] = approvedResources;
            }
          } catch (err) {
            // Silently fail for individual fetches
            console.error(`Failed to fetch bookings/resources for event ${event.id}:`, err);
          }
        })
      );
      setEventBookings(bookingsMap);
      setEventResources(resourcesMap);
    } catch (err) {
      setError(err || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [filter, typeFilter, visibilityFilter, periodFilter, searchQuery, customStartDate, customEndDate, userId, navigate]);

  useEffect(() => {
    document.title = 'My Events - CESMS';
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

  const handleRecordAttendance = (event) => {
    navigate(`/my-events/${event.id}/attendance`);
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
          <button onClick={handleCreateEvent} className="me-create-button">
            ➕ Create New Event
          </button>
          <button onClick={() => navigate('/home')} className="me-back-button">
            Back to Home
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="me-success-notification">
          ✅ {successMessage}
        </div>
      )}

      <div className="me-filter-section">
        <label>Event Name: </label>
        <input
          type="text"
          placeholder="Search by event name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', marginRight: '15px', width: '200px' }}
        />
        
        <label>Type: </label>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="seminar">Seminar</option>
          <option value="workshop">Workshop</option>
          <option value="sports">Sports</option>
          <option value="cultural">Cultural</option>
          <option value="career">Career</option>
          <option value="orientation">Orientation</option>
          <option value="networking">Networking</option>
          <option value="general">General</option>
        </select>
        
        <label style={{ marginLeft: '15px' }}>Status: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        
        <label style={{ marginLeft: '15px' }}>Visibility: </label>
        <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)}>
          <option value="all">All Visibility</option>
          <option value="campuswide">Campus-Wide</option>
          <option value="facultyonly">Faculty Only</option>
          <option value="inviteonly">Invite Only</option>
        </select>
        
        <label style={{ marginLeft: '15px' }}>Period: </label>
        <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="this-week">This Week</option>
          <option value="this-month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>
        
        {periodFilter === 'custom' && (
          <>
            <label style={{ marginLeft: '15px' }}>From: </label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <label style={{ marginLeft: '10px' }}>To: </label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </>
        )}
      </div>

      {error && <div className="me-error-message">{error}</div>}

      {loading ? (
        <div className="me-loading">Loading your events...</div>
      ) : events.length === 0 ? (
        <div className="me-no-events">
          {totalEvents === 0 ? (
            <>
              <p>You haven't created any events yet.</p>
              <button onClick={handleCreateEvent} className="me-create-button-large">
                Create Your First Event
              </button>
            </>
          ) : (
            <p>No {filter} events found.</p>
          )}
        </div>
      ) : (
        <>
          <div className="me-events-count">
            Showing {events.length} event{events.length !== 1 ? 's' : ''}
          </div>
          <div className="me-events-table-container">
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
                      {!eventBookings[event.id] && (
                        <button 
                          onClick={() => handleBookVenue(event)}
                          className="action-button book-button"
                          title="Book Venue"
                        >
                          📍
                        </button>
                      )}
                      {eventBookings[event.id] && !eventResources[event.id] && (
                        <button 
                          onClick={() => handleRequestResources(event)}
                          className="action-button resource-button"
                          title="Request Resources"
                        >
                          📦
                        </button>
                      )}
                      {isAttendanceAvailable(event) && (
                        <button 
                          onClick={() => handleRecordAttendance(event)}
                          className="action-button attendance-button"
                          title="Record Attendance"
                        >
                          📋
                        </button>
                      )}
                      {user?.role === 'organizer' && (
                        <button 
                          onClick={() => navigate(`/my-events/${event.id}/customize-form`)}
                          className="action-button customize-form-button"
                          title="Customize Registration Form"
                        >
                          📝
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
