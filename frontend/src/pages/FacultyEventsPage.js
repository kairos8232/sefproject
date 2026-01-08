import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFacultyEvents } from '../services/facultyEventService';
import { formatDateTime } from '../utils/dateUtils';
import './FacultyEventsPage.css';

function FacultyEventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    venue: '',
    booking_status: '',
    search: '',
    organizer: '',
    period: 'all',
    start_date: '',
    end_date: ''
  });



  const loadFacultyEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const dateRange = getPeriodDateRange();
      const filterParams = {
        status: filters.status || undefined,
        booking_status: filters.booking_status || undefined,
        start_date: dateRange.start,
        end_date: dateRange.end
      };

      const response = await getFacultyEvents(filterParams);
      setEvents(response.events || []);
    } catch (err) {
      console.error('Error loading faculty events:', err);
      setError(err.response?.data?.error || 'Failed to load faculty events');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.booking_status, filters.period, filters.start_date, filters.end_date]);

  useEffect(() => {
    document.title = 'Faculty Events - CESMS';
    loadFacultyEvents();
  }, [loadFacultyEvents]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Calculate period date range
  const getPeriodDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filters.period) {
      case 'today':
        return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
      case 'this-week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return { start: weekStart.toISOString().split('T')[0], end: weekEnd.toISOString().split('T')[0] };
      case 'this-month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: monthStart.toISOString().split('T')[0], end: monthEnd.toISOString().split('T')[0] };
      case 'custom':
        return { start: filters.start_date, end: filters.end_date };
      default:
        return { start: undefined, end: undefined };
    }
  };

  const handleViewDetails = (eventId) => {
    navigate(`/faculty-events/${eventId}`);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      upcoming: 'fep-status-badge fep-upcoming',
      ongoing: 'fep-status-badge fep-ongoing',
      completed: 'fep-status-badge fep-completed',
      cancelled: 'fep-status-badge fep-cancelled'
    };
    return <span className={statusClasses[status] || 'status-badge'}>{status}</span>;
  };

  const getBookingStatusBadge = (status) => {
    const statusClasses = {
      pending: 'fep-booking-status fep-pending',
      approved: 'fep-booking-status fep-approved',
      rejected: 'fep-booking-status fep-rejected',
      cancelled: 'fep-booking-status fep-cancelled'
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
        className: 'fep-btn-feedback-new',
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
      className: canEdit ? 'fep-btn-feedback-edit' : 'fep-btn-feedback-view',
      canEdit: canEdit
    };
  };

  // Filter events by search term, organizer, and venue
  const filteredEvents = events.filter(event => {
    // Event name search
    if (filters.search && !event.event_name?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    // Organizer search
    if (filters.organizer && !event.organizer?.name?.toLowerCase().includes(filters.organizer.toLowerCase())) {
      return false;
    }
    // Venue search
    if (filters.venue) {
      const booking = event.venue_bookings?.[0];
      const venueName = booking?.venue?.name?.toLowerCase() || '';
      const venueCode = booking?.venue?.code?.toLowerCase() || '';
      const searchTerm = filters.venue.toLowerCase();
      if (!venueName.includes(searchTerm) && !venueCode.includes(searchTerm)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="faculty-events-page">
      <div className="fep-page-header">
        <div>
          <h1>🏛️ Faculty Events</h1>
          <p>Review events scheduled in your faculty's venues</p>
        </div>
        <button onClick={() => navigate('/home')} className="fep-back-button">
          ← Back to Home
        </button>
      </div>

      {/* Filters Section */}
      <div className="fep-filter-section">
        <label>Event Name: </label>
        <input
          type="text"
          placeholder="Search event name..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', marginRight: '15px', width: '180px' }}
        />
        
        <label>Organizer: </label>
        <input
          type="text"
          placeholder="Search organizer..."
          value={filters.organizer}
          onChange={(e) => handleFilterChange('organizer', e.target.value)}
          style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', marginRight: '15px', width: '150px' }}
        />
        
        <label>Venue: </label>
        <input
          type="text"
          placeholder="Search venue..."
          value={filters.venue}
          onChange={(e) => handleFilterChange('venue', e.target.value)}
          style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', marginRight: '15px', width: '150px' }}
        />
        
        <label style={{ marginLeft: '15px' }}>Period: </label>
        <select value={filters.period} onChange={(e) => handleFilterChange('period', e.target.value)}>
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="this-week">This Week</option>
          <option value="this-month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>
        
        {filters.period === 'custom' && (
          <>
            <label style={{ marginLeft: '15px' }}>From: </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <label style={{ marginLeft: '10px' }}>To: </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </>
        )}
        
        <label style={{ marginLeft: '15px' }}>Event Status: </label>
        <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
          <option value="">All Statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        
        <label style={{ marginLeft: '15px' }}>Booking Status: </label>
        <select value={filters.booking_status} onChange={(e) => handleFilterChange('booking_status', e.target.value)}>
          <option value="">All</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Error Message */}
      {error && <div className="fep-error-message">{error}</div>}

      {/* Loading State */}
      {loading ? (
        <div className="fep-loading">Loading faculty events...</div>
      ) : (
        <>
          {/* Events Count */}
          <div className="fep-events-count">
            Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
          </div>

          {/* Events Table */}
          {filteredEvents.length === 0 ? (
            <div className="fep-no-events">
              <p>No events found matching your criteria.</p>
            </div>
          ) : (
            <div className="fep-table-container">
              <table className="fep-events-table">
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
                        <td className="fep-event-name">{event.event_name}</td>
                        <td>{event.organizer?.name || 'N/A'}</td>
                        <td>
                          <div className="fep-venue-info">
                            <div className="fep-venue-name">{booking?.venue?.name || 'N/A'}</div>
                            <div className="fep-venue-code">{booking?.venue?.code || ''}</div>
                          </div>
                        </td>
                        <td>
                          <div className="fep-datetime-cell">
                            <div>{formatDateTime(booking?.approved_start_datetime || booking?.requested_start_datetime || event.start_datetime)}</div>
                            <div className="fep-datetime-to">to</div>
                            <div>{formatDateTime(booking?.approved_end_datetime || booking?.requested_end_datetime || event.end_datetime)}</div>
                          </div>
                        </td>
                        <td>{getStatusBadge(event.status)}</td>
                        <td>{getBookingStatusBadge(booking?.status)}</td>
                        <td className="fep-text-center">
                          {booking?.expected_attendees || 'N/A'}
                        </td>
                        <td>
                          <div className="fep-action-buttons">
                            <button
                              onClick={() => handleViewDetails(event.id)}
                              className="fep-btn-icon fep-btn-view"
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
                                  className={`fep-btn-icon ${feedbackInfo.className}`}
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
