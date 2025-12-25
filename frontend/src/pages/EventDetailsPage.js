import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import './EventDetailsPage.css';

function EventDetailsPage() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { id } = useParams();
  const navigate = useNavigate();

  const loadEventDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await eventService.getEventById(id);
      setEvent(data.event);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEventDetails();
  }, [loadEventDetails]);

  const handleBackToEvents = () => {
    navigate('/events');
  };

  const formatDateTime = (datetime) => {
    return new Date(datetime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (start, end) => {
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatVisibility = (visibility, organizerFaculty) => {
    if (visibility === 'facultyonly' && organizerFaculty) {
      return `${organizerFaculty.code} only`;
    }
    if (visibility === 'campuswide') {
      return 'Campus-wide';
    }
    if (visibility === 'inviteonly') {
      return 'Invite only';
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
        <div className="loading">Loading event details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="event-details-container">
        <div className="error-message">{error}</div>
        <button onClick={handleBackToEvents} className="back-button">
          Back to Events
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-details-container">
        <div className="error-message">Event not found</div>
        <button onClick={handleBackToEvents} className="back-button">
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="event-details-container">
      <div className="event-details-header">
        <button onClick={handleBackToEvents} className="back-button">
          ← Back to Events
        </button>
      </div>

      <div className="event-details-content">
        <div className="event-header">
          <h1>{event.event_name}</h1>
          <span className={`status-badge status-${event.status}`}>
            {event.status}
          </span>
        </div>

        <div className="event-info-grid">
          <div className="info-section">
            <h3>Event Type</h3>
            <p className="capitalize">{event.event_type || 'General Event'}</p>
          </div>

          <div className="info-section">
            <h3>Visibility</h3>
            <p className="capitalize">{formatVisibility(event.visibility, event.organizer?.faculty)}</p>
          </div>

          <div className="info-section">
            <h3>Duration</h3>
            <p>{calculateDuration(event.start_datetime, event.end_datetime)}</p>
          </div>

          <div className="info-section">
            <h3>Organizer</h3>
            <p>{event.organizer?.email || 'Unknown'}</p>
            <p className="role-badge">{formatRole(event.organizer?.role, event.organizer?.faculty)}</p>
          </div>
        </div>

        <div className="event-description-section">
          <h3>Description</h3>
          <p>{event.description || 'No description provided.'}</p>
        </div>

        <div className="event-schedule">
          <h3>Schedule</h3>
          <div className="schedule-item">
            <strong>Start:</strong>
            <span>{formatDateTime(event.start_datetime)}</span>
          </div>
          <div className="schedule-item">
            <strong>End:</strong>
            <span>{formatDateTime(event.end_datetime)}</span>
          </div>
        </div>

        <div className="event-meta">
          <p><strong>Event ID:</strong> {event.id}</p>
          <p><strong>Created:</strong> {formatDateTime(event.created_at)}</p>
        </div>
      </div>
    </div>
  );
}

export default EventDetailsPage;
