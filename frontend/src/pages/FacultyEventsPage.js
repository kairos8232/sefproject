import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFacultyEvents } from '../services/facultyEventService';
import { formatDateTime } from '../utils/dateUtils';
import axios from 'axios';
import './FacultyEventsPage.css';

function FacultyEventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    venue_id: '',
    booking_status: '',
    start_date: '',
    end_date: '',
    search: ''
  });

  const loadVenues = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/venues', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setVenues(response.data.venues);
      }
    } catch (err) {
      console.error('Error loading venues:', err);
    }
  };

  const loadFacultyEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const filterParams = {
        status: filters.status || undefined,
        venue_id: filters.venue_id || undefined,
        booking_status: filters.booking_status || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined
      };

      const response = await getFacultyEvents(filterParams);
      setEvents(response.events || []);
    } catch (err) {
      console.error('Error loading faculty events:', err);
      setError(err.response?.data?.error || 'Failed to load faculty events');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.venue_id, filters.booking_status, filters.start_date, filters.end_date]);

  useEffect(() => {
    loadFacultyEvents();
    loadVenues();
  }, [loadFacultyEvents]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleViewDetails = (eventId) => {
    navigate(`/faculty-events/${eventId}`);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      upcoming: 'status-badge upcoming',
      ongoing: 'status-badge ongoing',
      completed: 'status-badge completed',
      cancelled: 'status-badge cancelled'
    };
    return <span className={statusClasses[status] || 'status-badge'}>{status}</span>;
  };

  const getBookingStatusBadge = (status) => {
    const statusClasses = {
      pending: 'booking-status pending',
      approved: 'booking-status approved',
      rejected: 'booking-status rejected',
      cancelled: 'booking-status cancelled'
    };
    return <span className={statusClasses[status] || 'booking-status'}>{status}</span>;
  };

  // Check if event is eligible for feedback (completed + last 3 months + approved booking)
  const isEligibleForFeedback = (event) => {
    if (event.status !== 'completed') return false;
    
    const eventEnd = new Date(event.end_datetime);
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const hasApprovedBooking = event.venue_bookings?.some(b => b.status === 'approved');
    
    return eventEnd < now && eventEnd > threeMonthsAgo && hasApprovedBooking;
  };

  // Navigate to feedback page
  const handleProvideFeedback = (event) => {
    navigate(`/faculty-events/${event.id}/feedback`);
  };

  // Get feedback button info based on state
  const getFeedbackButtonInfo = (event) => {
    if (!event.user_feedback) {
      return {
        icon: '📝',
        tooltip: 'Provide Feedback',
        className: 'btn-feedback-new',
        canEdit: true
      };
    }
    
    // Check if feedback is within 24 hours (editable)
    // Always use created_at for the 24-hour window calculation
    // (updated_at from database seeding is not reliable)
    const feedbackDate = new Date(event.user_feedback.created_at);
    const now = new Date();
    const hoursSinceSubmission = (now - feedbackDate) / (1000 * 60 * 60);
    const canEdit = hoursSinceSubmission < 24;
    
    return {
      icon: canEdit ? '✏️' : '👁️',
      tooltip: canEdit ? 'Edit Feedback (within 24h)' : 'View Feedback (read-only)',
      className: canEdit ? 'btn-feedback-edit' : 'btn-feedback-view',
      canEdit: canEdit
    };
  };

  // Filter events by search term
  const filteredEvents = events.filter(event => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      event.event_name?.toLowerCase().includes(searchLower) ||
      event.organizer?.name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="faculty-events-page">
      <div className="page-header">
        <div>
          <h1>🏛️ Faculty Events</h1>
          <p>Review events scheduled in your faculty's venues</p>
        </div>
        <button onClick={() => navigate('/home')} className="back-button">
          ← Back to Home
        </button>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filters-grid">
          {/* Event Status Filter */}
          <div className="filter-group">
            <label>Event Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Venue Filter */}
          <div className="filter-group">
            <label>Venue</label>
            <select
              value={filters.venue_id}
              onChange={(e) => handleFilterChange('venue_id', e.target.value)}
            >
              <option value="">All Venues</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} ({venue.code})
                </option>
              ))}
            </select>
          </div>

          {/* Booking Status Filter */}
          <div className="filter-group">
            <label>Booking Status</label>
            <select
              value={filters.booking_status}
              onChange={(e) => handleFilterChange('booking_status', e.target.value)}
            >
              <option value="">All Booking Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Search Filter */}
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Event name or organizer..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          {/* Date Range Filters */}
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Loading State */}
      {loading ? (
        <div className="loading">Loading faculty events...</div>
      ) : (
        <>
          {/* Events Count */}
          <div className="events-count">
            <p>Showing {filteredEvents.length} event(s)</p>
          </div>

          {/* Events Table */}
          {filteredEvents.length === 0 ? (
            <div className="no-events">
              <p>No events found matching your criteria.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="events-table">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Organizer</th>
                    <th>Venue</th>
                    <th>Date & Time</th>
                    <th>Event Status</th>
                    <th>Booking Status</th>
                    <th>Attendees</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map(event => {
                    const booking = event.venue_bookings?.[0]; // Get first booking
                    return (
                      <tr key={event.id}>
                        <td className="event-name">{event.event_name}</td>
                        <td>{event.organizer?.name || 'N/A'}</td>
                        <td>
                          {booking?.venue?.name || 'N/A'}
                          <br />
                          <small className="venue-code">
                            {booking?.venue?.code}
                          </small>
                        </td>
                        <td className="datetime">
                          {formatDateTime(event.start_datetime)}
                          <br />
                          <small>to</small>
                          <br />
                          {formatDateTime(event.end_datetime)}
                        </td>
                        <td>{getStatusBadge(event.status)}</td>
                        <td>{getBookingStatusBadge(booking?.status)}</td>
                        <td className="text-center">
                          {booking?.expected_attendees || 'N/A'}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => handleViewDetails(event.id)}
                              className="btn-icon btn-view"
                              title="View Event Details"
                            >
                              👁
                            </button>
                            {isEligibleForFeedback(event) && (() => {
                              const feedbackInfo = getFeedbackButtonInfo(event);
                              // Only show feedback button if it's actionable (new or editable)
                              // Don't show for read-only feedback (>24h old)
                              if (!feedbackInfo.canEdit) return null;
                              
                              return (
                                <button
                                  onClick={() => handleProvideFeedback(event)}
                                  className={`btn-icon ${feedbackInfo.className}`}
                                  title={feedbackInfo.tooltip}
                                >
                                  {feedbackInfo.icon}
                                </button>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default FacultyEventsPage;
