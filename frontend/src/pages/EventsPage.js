import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import eventService from '../services/eventService';
import participationService from '../services/participationService';
import './EventsPage.css';

function EventsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(location.state?.filter || 'all');

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      let data;
      if (filter === 'registered') {
        // Get user's registered events
        const participations = await participationService.getMyParticipations();
        // Filter only registered status (not cancelled)
        const registeredEvents = participations
          .filter(p => p.status === 'registered')
          .map(p => p.event);
        setEvents(registeredEvents);
        setLoading(false);
        return;
      } else if (filter === 'all') {
        data = await eventService.getAllEvents();
      } else if (filter === 'upcoming' || filter === 'ongoing') {
        data = await eventService.getEventsByStatus(filter);
      } else {
        data = await eventService.getEventsByVisibility(filter);
      }
      
      setEvents(data.events || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleEventClick = (eventId) => {
    navigate(`/events/${eventId}`, { state: { fromEventsPage: true, filter } });
  };

  const handleBackToHome = () => {
    navigate('/home');
  };

  const formatDateTime = (datetime) => {
    return new Date(datetime).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <h1>Browse Events</h1>
          <p>Explore all campus events and activities</p>
        </div>
        <button onClick={handleBackToHome} className="back-button">
          Back to Home
        </button>
      </div>

      <div className="filter-section">
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

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="no-events">No events found.</div>
      ) : (
        <div className="events-grid">
          {events.map((event) => (
            <div 
              key={event.id} 
              className="event-card"
              onClick={() => handleEventClick(event.id)}
            >
              <div className="event-status-badge">{event.status}</div>
              <h3>{event.event_name}</h3>
              <p className="event-type">{event.event_type || 'General'}</p>
              <p className="event-description">
                {event.description?.substring(0, 100)}
                {event.description?.length > 100 ? '...' : ''}
              </p>
              <div className="event-details">
                <p><strong>Start:</strong> {formatDateTime(event.start_datetime)}</p>
                <p><strong>Visibility:</strong> {formatVisibility(event.visibility)}</p>
                <p><strong>Organizer:</strong> {event.organizer?.name || event.organizer?.email || 'Unknown'}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="events-count">
        Showing {events.length} event{events.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export default EventsPage;
