import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import eventService from '../services/eventService';
import participationService from '../services/participationService';
import { formatDateTime } from '../utils/dateUtils';
import './EventsPage.css';

function EventsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]); // Store all events for client-side filtering
  const [myParticipations, setMyParticipations] = useState([]); // Store user's registrations
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(location.state?.filter || 'all');

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
    loadEvents();
  }, [loadEvents]);

  // Client-side filtering when filter changes
  useEffect(() => {
    const applyFilter = () => {
      let filtered = [...allEvents];
      
      if (filter === 'upcoming') {
        filtered = filtered.filter(e => e.status === 'upcoming');
      } else if (filter === 'ongoing') {
        filtered = filtered.filter(e => e.status === 'ongoing');
      } else if (filter === 'registered') {
        // Filter events that the user has registered for
        const registeredEventIds = myParticipations.map(p => p.event_id);
        filtered = filtered.filter(e => registeredEventIds.includes(e.id));
      } else if (filter === 'campuswide' || filter === 'facultyonly' || filter === 'inviteonly') {
        filtered = filtered.filter(e => e.visibility === filter);
      }
      // 'all' shows everything
      
      setEvents(filtered);
    };
    
    applyFilter();
  }, [allEvents, filter, myParticipations]);

  const handleEventClick = (eventId) => {
    navigate(`/events/${eventId}`, { state: { fromEventsPage: true, filter } });
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  const formatVisibility = (visibility) => {
    if (visibility === 'campuswide') return 'Campus-Wide';
    if (visibility === 'facultyonly') return 'Faculty Only';
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
        <label>Filter by: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Events</option>
          <option value="registered">My Registrations</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="campuswide">Campus Wide</option>
          <option value="facultyonly">Faculty Only</option>
          <option value="inviteonly">Invite Only</option>
        </select>
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
              <div className="ep-event-status-badge">{event.status}</div>
              <h3>{event.event_name}</h3>
              <p className="ep-event-type">{event.event_type || 'General'}</p>
              <p className="ep-event-description">
                {event.description?.substring(0, 100)}
                {event.description?.length > 100 ? '...' : ''}
              </p>
              <div className="ep-event-details">
                <p><strong>Start:</strong> {formatDateTime(event.start_datetime)}</p>
                <p><strong>Visibility:</strong> {formatVisibility(event.visibility)}</p>
                <p><strong>Organizer:</strong> {event.organizer?.name || event.organizer?.email || 'Unknown'}</p>
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
