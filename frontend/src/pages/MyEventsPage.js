import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
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
  const [highlightedEventId, setHighlightedEventId] = useState(null);
  const [deleteModalEvent, setDeleteModalEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [registrationFilter, setRegistrationFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getCurrentUser();
  const userId = user?.id; // Extract primitive to prevent re-renders
  const { showSuccess, showError } = useToast();

  // Check authentication
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  // Show success toast for new event creation and highlight
  useEffect(() => {
    if (location.state?.showSuccessToast) {
      showSuccess('Event created successfully!');
      
      if (location.state?.newEventId) {
        setHighlightedEventId(location.state.newEventId);
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          setHighlightedEventId(null);
        }, 3000);
      }
      
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, showSuccess]);

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
      
      console.log('[MyEvents] Starting loadMyEvents, userId:', userId);
      
      if (!userId) {
        console.log('[MyEvents] No userId, redirecting to login');
        navigate('/login');
        return;
      }
      
      const data = await eventService.getAllEvents();
      console.log('[MyEvents] Raw API response:', data);
      console.log('[MyEvents] Total events from API:', data.events?.length);
      console.log('[MyEvents] All event organizer_ids:', data.events?.map(e => ({ name: e.event_name, organizer_id: e.organizer_id })));
      
      // Filter events created by current user
      let myEvents = data.events.filter(e => e.organizer_id === userId);
      console.log('[MyEvents] Events created by current user:', myEvents.length);
      console.log('[MyEvents] My events:', myEvents);
      
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

      // Apply registration status filter
      if (registrationFilter !== 'all') {
        myEvents = myEvents.filter(e => e.registration_status === registrationFilter);
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
      console.log('[MyEvents] Final filtered events to display:', myEvents.length);
      console.log('[MyEvents] Final events array:', myEvents);

      // Fetch venue bookings and resource requests for each event
      const bookingsMap = {};
      const resourcesMap = {};
      await Promise.all(
        myEvents.map(async (event) => {
          try {
            // Fetch venue bookings
            const bookingResponse = await venueBookingService.getBookingsByEvent(event.id);
            console.log(`[MyEvents] Bookings for event "${event.event_name}":`, bookingResponse);
            
            const approvedBookings = bookingResponse.bookings?.filter(b => b.status === 'approved') || [];
            console.log(`[MyEvents] Approved bookings (${approvedBookings.length}):`, approvedBookings);
            
            if (approvedBookings.length > 0) {
              // Group bookings by package_id
              const packages = {};
              const standaloneBookings = [];
              
              approvedBookings.forEach(booking => {
                console.log(`[MyEvents] Processing booking:`, booking.id, 'package_id:', booking.package_id);
                if (booking.package_id) {
                  if (!packages[booking.package_id]) {
                    packages[booking.package_id] = [];
                  }
                  packages[booking.package_id].push(booking);
                } else {
                  standaloneBookings.push(booking);
                }
              });
              
              const bookingData = {
                packages: Object.values(packages), // Array of arrays (each inner array is a package)
                standalone: standaloneBookings
              };
              
              console.log(`[MyEvents] Grouped bookings for event ${event.id}:`, bookingData);
              bookingsMap[event.id] = bookingData;
            }
            
            // Fetch resource requests
            const resourceResponse = await resourceRequestService.getByEvent(event.id);
            console.log(`[MyEvents] Resources for event "${event.event_name}":`, resourceResponse);
            
            const approvedResources = resourceResponse.requests?.filter(r => r.status === 'approved') || [];
            console.log(`[MyEvents] Approved resources (${approvedResources.length}):`, approvedResources);
            
            if (approvedResources.length > 0) {
              // Group resources by package_id
              const resourcePackages = {};
              const standaloneResources = [];
              
              approvedResources.forEach(resource => {
                console.log(`[MyEvents] Processing resource:`, resource.id, 'package_id:', resource.package_id);
                if (resource.package_id) {
                  if (!resourcePackages[resource.package_id]) {
                    resourcePackages[resource.package_id] = [];
                  }
                  resourcePackages[resource.package_id].push(resource);
                } else {
                  standaloneResources.push(resource);
                }
              });
              
              const resourceData = {
                packages: Object.values(resourcePackages), // Array of arrays
                standalone: standaloneResources
              };
              
              console.log(`[MyEvents] Grouped resources for event ${event.id}:`, resourceData);
              resourcesMap[event.id] = resourceData;
      
      console.log('[MyEvents] Final bookingsMap:', bookingsMap);
      console.log('[MyEvents] Final resourcesMap:', resourcesMap);
      
            }
          } catch (err) {
            // Silently fail for individual fetches
            console.error(`Failed to fetch bookings/resources for event ${event.id}:`, err);
          }
        })
      );
      setEventBookings(bookingsMap);
      setEventResources(resourcesMap);
      console.log('[MyEvents] State updated successfully');
    } catch (err) {
      console.error('[MyEvents] Error in loadMyEvents:', err);
      console.error('[MyEvents] Error details:', err?.response?.data || err.message);
      setError(err || 'Failed to load events');
    } finally {
      setLoading(false);
      console.log('[MyEvents] Loading complete');
    }
  }, [filter, typeFilter, visibilityFilter, registrationFilter, periodFilter, searchQuery, customStartDate, customEndDate, userId, navigate]);

  useEffect(() => {
    document.title = 'My Events - CESMS';
    loadMyEvents();
  }, [filter, location, loadMyEvents]);

  const handleEditEvent = (eventId) => {
    navigate(`/events/${eventId}/edit`);
  };

  const handleViewEvent = (eventId) => {
    navigate(`/events/${eventId}`, { state: { fromMyEvents: true } });
  };

  const handleToggleRegistration = async (event) => {
    const action = event.registration_status === 'open' ? 'close' : 'open';
    const actionText = action === 'open' ? 'reopen' : 'close';
    
    // Show confirmation for reopening
    if (action === 'open') {
      const registrationInfo = event.registration_limit 
        ? `Registration limit: ${event.registered_count || 0}/${event.registration_limit}`
        : '';
      
      if (!window.confirm(`Are you sure you want to reopen registration for "${event.event_name}"?\n${registrationInfo}`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to close registration for "${event.event_name}"?`)) {
        return;
      }
    }

    try {
      await eventService.toggleRegistrationStatus(event.id);
      showSuccess(`Registration ${action === 'open' ? 'opened' : 'closed'} successfully`);
      loadMyEvents(); // Reload to get updated status
    } catch (err) {
      showError(err?.response?.data?.error || `Failed to ${actionText} registration`);
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
    const bookingsData = eventBookings[event.id];
    if (bookingsData) {
      // Use the first approved booking (from package or standalone)
      const firstBooking = bookingsData.packages?.[0]?.[0] || bookingsData.standalone?.[0];
      if (firstBooking) {
        navigate('/request-resources', { state: { event, venueBooking: firstBooking } });
      }
    }
  };

  const handleDeleteEventClick = (event) => {
    setDeleteModalEvent(event);
  };

  const handleDeleteEventConfirm = async () => {
    if (!deleteModalEvent) return;
    
    const eventToDelete = deleteModalEvent;
    
    try {
      // Optimistically remove from UI
      setEvents(events.filter(e => e.id !== eventToDelete.id));
      
      // Show toast with undo option
      let undoTimeout;
      showSuccess(`Event "${eventToDelete.event_name}" deleted successfully`, {
        duration: 5000,
        onUndo: async () => {
          clearTimeout(undoTimeout);
          // Restore the event in UI
          await loadMyEvents();
          showSuccess('Event restored');
        }
      });
      
      // Actually delete after 5 seconds
      undoTimeout = setTimeout(async () => {
        try {
          await eventService.deleteEvent(eventToDelete.id);
        } catch (err) {
          console.error('Failed to delete event:', err);
          showError('Failed to delete event');
          // Reload events to restore
          loadMyEvents();
        }
      }, 5000);
      
    } catch (err) {
      showError(err || 'Failed to delete event');
      // Reload events to restore
      loadMyEvents();
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

      <div className="me-filter-section">
        <div className="me-filter-group">
          <label>Event Name:</label>
          <input
            type="text"
            placeholder="Search by event name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '180px' }}
          />
        </div>
        
        <div className="me-filter-group">
          <label>Type:</label>
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
        </div>
        
        <div className="me-filter-group">
          <label>Status:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        <div className="me-filter-group">
          <label>Visibility:</label>
          <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)}>
            <option value="all">All Visibility</option>
            <option value="campuswide">Campus-Wide</option>
            <option value="facultyonly">Faculty Only</option>
            <option value="inviteonly">Invite Only</option>
          </select>
        </div>

        <div className="me-filter-group">
          <label>Registration:</label>
          <select value={registrationFilter} onChange={(e) => setRegistrationFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        
        <div className="me-filter-group">
          <label>Period:</label>
          <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        
        {periodFilter === 'custom' && (
          <>
            <div className="me-filter-group">
              <label>From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div className="me-filter-group">
              <label>To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
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
                  <th>Event</th>
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
                  <tr 
                    key={event.id}
                    className={highlightedEventId === event.id ? 'highlighted-event' : ''}
                  >
                    <td className="event-name-cell">
                      <div className="event-name">{event.event_name}</div>
                      {event.description && (
                        <div className="event-description-preview">
                          {event.description.substring(0, 50)}
                          {event.description.length > 50 ? '...' : ''}
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
                      {event.registration_status === 'open' && (
                        <span className="registration-status-badge open">Open</span>
                      )}
                      {event.registration_status === 'closed' && (
                        <span className="registration-status-badge closed">Closed</span>
                      )}
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
                      <button 
                        onClick={() => navigate(`/my-events/${event.id}/customize-form`)}
                        className="action-button customize-form-button"
                        title="Customize Registration Form"
                      >
                        📝
                      </button>
                      <button 
                        onClick={() => handleToggleRegistration(event)}
                        className={`action-button ${event.registration_status === 'open' ? 'close-reg-button' : 'open-reg-button'}`}
                        title={event.registration_status === 'open' ? 'Close Registration' : 'Open Registration'}
                      >
                        {event.registration_status === 'open' ? '🔒' : '🔓'}
                      </button>
                      <button 
                        onClick={() => handleEditEvent(event.id)}
                        className="action-button edit-button"
                        title="Edit Event"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteEventClick(event)}
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

      {/* Delete Event Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteModalEvent}
        onClose={() => setDeleteModalEvent(null)}
        onConfirm={handleDeleteEventConfirm}
        title="Delete Event"
        message={`Are you sure you want to delete "${deleteModalEvent?.event_name}"? This action can be undone within 5 seconds.`}
        confirmText="Yes, Delete Event"
        cancelText="Cancel"
        danger={true}
      />
    </div>
  );
}

export default MyEventsPage;
