import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import eventService from '../services/eventService';
import participationService from '../services/participationService';
import authService from '../services/authService';
import { formatDateTime } from '../utils/dateUtils';
import './EventsPage.css';

function EventsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === 'administrator';
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]); // Store all events for client-side filtering
  const [myParticipations, setMyParticipations] = useState([]); // Store user's registrations
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter] = useState(location.state?.filter || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showMyRegistrations, setShowMyRegistrations] = useState(location.state?.filter === 'registered' || false);
  const [myEventsFilter, setMyEventsFilter] = useState('all'); // 'all', 'exclude', 'only'
  const [registrationFilter, setRegistrationFilter] = useState('all'); // 'all', 'open', 'closed'

  const userRole = currentUser?.role;

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all events for client-side filtering
      const data = await eventService.getAllEvents();
      setAllEvents(data.events || []);
      
      // Fetch user's participations for registration filter
      try {
        const participations = await participationService.getMyParticipations();
        setMyParticipations(participations || []);
      } catch (err) {
        // If user is not logged in or error fetching participations, set empty array
        setMyParticipations([]);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Browse Events - CESMS';
    loadEvents();
  }, [loadEvents]);

  // Client-side filtering when filter changes
  useEffect(() => {
    const applyFilter = () => {
      let filtered = [...allEvents];
      
      // Filter by approved venue bookings for students only
      // Admins, event organizers, and faculty managers can see all events
      if (userRole === 'student') {
        filtered = filtered.filter(e => {
          // Event must have at least one approved venue booking
          return e.venue_bookings && e.venue_bookings.some(b => b.status === 'approved');
        });
      }
      
      // Apply search filter (event name)
      if (searchQuery.trim()) {
        filtered = filtered.filter(e => 
          e.event_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Apply status filter (new dropdown)
      if (statusFilter !== 'all') {
        filtered = filtered.filter(e => e.status === statusFilter);
      }
      
      // Apply event type filter
      if (eventTypeFilter !== 'all') {
        filtered = filtered.filter(e => e.event_type === eventTypeFilter);
      }
      
      // Apply visibility filter
      if (visibilityFilter !== 'all') {
        filtered = filtered.filter(e => e.visibility === visibilityFilter);
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
          filtered = filtered.filter(e => {
            const start = new Date(e.start_datetime);
            const end = new Date(e.end_datetime);
            return start <= todayEnd && end >= today;
          });
        } else if (periodFilter === 'this-week') {
          // Events happening within this week (including multi-day events)
          filtered = filtered.filter(e => {
            const start = new Date(e.start_datetime);
            const end = new Date(e.end_datetime);
            return start < weekEnd && end >= today;
          });
        } else if (periodFilter === 'this-month') {
          // Events happening within the current calendar month (including multi-day events)
          filtered = filtered.filter(e => {
            const start = new Date(e.start_datetime);
            const end = new Date(e.end_datetime);
            return start <= monthEnd && end >= monthStart;
          });
        } else if (periodFilter === 'custom') {
          // Custom date range filter
          if (customStartDate || customEndDate) {
            filtered = filtered.filter(e => {
              const eventStart = new Date(e.start_datetime);
              const eventEnd = new Date(e.end_datetime);
              
              if (customStartDate && customEndDate) {
                const rangeStart = new Date(customStartDate);
                const rangeEnd = new Date(customEndDate);
                rangeEnd.setHours(23, 59, 59, 999);
                return eventStart <= rangeEnd && eventEnd >= rangeStart;
              } else if (customStartDate) {
                const rangeStart = new Date(customStartDate);
                return eventEnd >= rangeStart;
              } else if (customEndDate) {
                const rangeEnd = new Date(customEndDate);
                rangeEnd.setHours(23, 59, 59, 999);
                return eventStart <= rangeEnd;
              }
              return true;
            });
          }
        }
      }
      
      // Apply My Registrations filter (checkbox)
      if (showMyRegistrations) {
        const registeredEventIds = myParticipations.map(p => p.event_id);
        filtered = filtered.filter(e => registeredEventIds.includes(e.id));
      }

      // Apply My Events filter (dropdown) - 3 options
      const currentUserId = currentUser?.id;
      if (myEventsFilter === 'only' && currentUserId) {
        // Show only events created by current user
        filtered = filtered.filter(e => e.organizer_id === currentUserId);
      } else if (myEventsFilter === 'exclude' && currentUserId) {
        // Show all events except those created by current user
        filtered = filtered.filter(e => e.organizer_id !== currentUserId);
      }
      // 'all' - no filtering needed

      // Apply registration status filter
      if (registrationFilter !== 'all') {
        filtered = filtered.filter(e => e.registration_status === registrationFilter);
      }
      
      setEvents(filtered);
    };
    
    applyFilter();
  }, [allEvents, userRole, filter, myParticipations, statusFilter, eventTypeFilter, searchQuery, visibilityFilter, periodFilter, customStartDate, customEndDate, showMyRegistrations, myEventsFilter, registrationFilter, currentUser?.id]);

  const handleEventClick = useCallback((eventId) => {
    console.log('[EventsPage] Navigating to event:', eventId);
    navigate(`/events/${eventId}`, { state: { fromEventsPage: true, filter } });
  }, [navigate, filter]);

  const handleBackToHome = useCallback(() => {
    console.log('[EventsPage] Navigating back to home');
    navigate('/home');
  }, [navigate]);

  const formatVisibility = (visibility, event) => {
    if (visibility === 'campuswide') return 'Campus-Wide';
    if (visibility === 'facultyonly') {
      // Show specific faculty for admin and event organizer
      if (isAdmin || currentUser?.role === 'event_organizer') {
        const facultyCode = event?.organizer?.faculty?.code;
        return facultyCode ? `${facultyCode} only` : 'Faculty only';
      }
      return 'Faculty Only';
    }
    if (visibility === 'inviteonly') return 'Invite Only';
    return visibility;
  };

  return (
    <div className="events-container">
      <div className="events-header">
        <div>
          <h1>🎯 Browse Events</h1>
          <p>Explore all campus events and activities</p>
        </div>
        <button onClick={handleBackToHome} className="ep-back-button">
          Back to Home
        </button>
      </div>

      <div className="ep-filter-section">
        <div className="ep-filter-group">
          <label>Event Name:</label>
          <input
            type="text"
            placeholder="Search by event name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '180px' }}
          />
        </div>
        
        <div className="ep-filter-group">
          <label>Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="ep-filter-group">
          <label>Registration:</label>
          <select value={registrationFilter} onChange={(e) => setRegistrationFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        
        <div className="ep-filter-group">
          <label>Type:</label>
          <select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)}>
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
        
        <div className="ep-filter-group">
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
            <div className="ep-filter-group">
              <label>From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div className="ep-filter-group">
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
        
        <div className="ep-filter-group">
          <label>Visibility:</label>
          <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)}>
            <option value="all">All Visibility</option>
            <option value="campuswide">Campus-Wide</option>
            <option value="facultyonly">Faculty Only</option>
            <option value="inviteonly">Invite Only</option>
          </select>
        </div>
        
        {!isAdmin && (
          <>
            <div className="ep-filter-group">
              <label>My Events:</label>
              <select value={myEventsFilter} onChange={(e) => setMyEventsFilter(e.target.value)}>
                <option value="all">All Events</option>
                <option value="exclude">Exclude My Events</option>
                <option value="only">My Events Only</option>
              </select>
            </div>
              <div className="ep-filter-group">
              <label style={{ visibility: 'hidden' }}>_</label>
              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={showMyRegistrations}
                  onChange={(e) => setShowMyRegistrations(e.target.checked)}
                  style={{ marginRight: '5px', cursor: 'pointer' }}
                />
                My Registrations
              </label>
            </div>
          </>
        )}
      </div>

      {error && <div className="ep-error-message">{error}</div>}

      {loading ? (
        <div className="ep-loading">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="ep-no-events">No events found.</div>
      ) : (
        <div className="ep-events-grid">
          {events.map((event) => (
            <div 
              key={event.id} 
              className="ep-event-card"
              onClick={() => handleEventClick(event.id)}
            >
              <h3>{event.event_name}</h3>
              <p className="ep-event-type">{event.event_type || 'General'}</p>
              <p className="ep-event-description">
                {event.description?.substring(0, 100)}
                {event.description?.length > 100 ? '...' : ''}
              </p>
              <div className="ep-event-details">
                <p>
                  <strong>Start:</strong> {formatDateTime(event.start_datetime)}
                  <span className={`ep-event-status-badge ${event.status}`}>{event.status}</span>
                </p>
                <p>
                  <strong>Visibility:</strong> {formatVisibility(event.visibility, event)}
                  {event.registration_status === 'closed' && (
                    <span className="registration-closed-badge">Closed</span>
                  )}
                  {event.registration_status === 'open' && (
                    <span className="registration-open-badge">Open</span>
                  )}
                </p>
                <p><strong>Organizer: </strong> 
                  {event.organizer?.name || event.organizer?.email || 'Unknown'}{event.organizer_id === currentUser?.id && (
                    // <span style={{ marginLeft: '6px', padding: '2px 8px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '12px', fontSize: '11px', fontWeight: '600' }}>
                    <span className="organizer-you-badge">You</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ep-events-count">
        Showing {events.length} event{events.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export default EventsPage;
