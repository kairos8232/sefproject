import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import venueBookingService from '../services/venueBookingService';
import { formatDateTime } from '../utils/dateUtils';
import './MyVenueRequestsPage.css';

function MyVenueRequestsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [eventSearch, setEventSearch] = useState('');
  const [venueSearch, setVenueSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const navigate = useNavigate();

  const loadMyBookings = useCallback(async () => {
    document.title = 'My Venue Requests - CESMS';
    try {
      setError('');
      const result = await venueBookingService.getMyBookings();
      let myBookings = result.bookings || [];

      // Apply event name filter
      if (eventSearch.trim()) {
        myBookings = myBookings.filter(b => 
          b.event?.event_name?.toLowerCase().includes(eventSearch.toLowerCase())
        );
      }
      
      // Apply venue filter
      if (venueSearch.trim()) {
        myBookings = myBookings.filter(b => 
          b.venue?.name?.toLowerCase().includes(venueSearch.toLowerCase())
        );
      }

      // Apply status filter
      if (filter !== 'all') {
        myBookings = myBookings.filter(b => b.status === filter);
      }
      
      // Apply period filter
      if (periodFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        if (periodFilter === 'today') {
          myBookings = myBookings.filter(b => {
            const start = new Date(b.requested_start_datetime);
            const end = new Date(b.requested_end_datetime);
            return start <= todayEnd && end >= today;
          });
        } else if (periodFilter === 'this-week') {
          myBookings = myBookings.filter(b => {
            const start = new Date(b.requested_start_datetime);
            const end = new Date(b.requested_end_datetime);
            return start < weekEnd && end >= today;
          });
        } else if (periodFilter === 'this-month') {
          myBookings = myBookings.filter(b => {
            const start = new Date(b.requested_start_datetime);
            const end = new Date(b.requested_end_datetime);
            return start <= monthEnd && end >= monthStart;
          });
        } else if (periodFilter === 'custom') {
          if (customStartDate || customEndDate) {
            myBookings = myBookings.filter(b => {
              const requestStart = new Date(b.requested_start_datetime);
              const requestEnd = new Date(b.requested_end_datetime);
              
              if (customStartDate && customEndDate) {
                const rangeStart = new Date(customStartDate);
                const rangeEnd = new Date(customEndDate);
                rangeEnd.setHours(23, 59, 59, 999);
                return requestStart <= rangeEnd && requestEnd >= rangeStart;
              } else if (customStartDate) {
                const rangeStart = new Date(customStartDate);
                return requestEnd >= rangeStart;
              } else if (customEndDate) {
                const rangeEnd = new Date(customEndDate);
                rangeEnd.setHours(23, 59, 59, 999);
                return requestStart <= rangeEnd;
              }
              return true;
            });
          }
        }
      }

      setBookings(myBookings);
    } catch (err) {
      console.error('Load bookings error:', err);
      setError(err.response?.data?.error || 'Failed to load venue requests');
    } finally {
      setLoading(false);
    }
  }, [filter, eventSearch, venueSearch, periodFilter, customStartDate, customEndDate]);

  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      await loadMyBookings();
      setLoading(false);
    };
    initialLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      loadMyBookings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, eventSearch, venueSearch, periodFilter, customStartDate, customEndDate]);

  const handleViewDetails = (bookingId) => {
    navigate(`/venue-bookings/${bookingId}`, { state: { fromVenueRequests: true } });
  };

  const handleCancelBooking = async (bookingId, eventName) => {
    if (!window.confirm(`Are you sure you want to cancel the venue booking for "${eventName}"?`)) {
      return;
    }

    try {
      await venueBookingService.cancelBooking(bookingId);
      loadMyBookings();
      alert('Venue booking cancelled successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel booking');
    }
  };

  const getStatusBadgeClass = (status) => {
    return `mvr-status-${status}`;
  };

  if (loading) {
    return (
      <div className="my-venue-requests-container">
        <div className="mvr-loading">Loading venue requests...</div>
      </div>
    );
  }

  return (
    <div className="my-venue-requests-container">
      <div className="mvr-header">
        <div>
          <h1>My Venue Requests</h1>
          <p>Manage your venue booking requests</p>
        </div>
        <button onClick={() => navigate('/home')} className="mvr-back-button">
          Back to Home
        </button>
      </div>

      {error && <div className="mvr-error-message">{error}</div>}

      {/* Filter Section */}
      <div className="mvr-filter-section">
        <div className="mvr-filter-group">
          <label>Event Name:</label>
          <input
            type="text"
            placeholder="Search event name..."
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '180px' }}
          />
        </div>
        
        <div className="mvr-filter-group">
          <label>Venue:</label>
          <input
            type="text"
            placeholder="Search venue..."
            value={venueSearch}
            onChange={(e) => setVenueSearch(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '150px' }}
          />
        </div>
        
        <div className="mvr-filter-group">
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
            <div className="mvr-filter-group">
              <label>From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div className="mvr-filter-group">
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
        
        <div className="mvr-filter-group">
          <label>Status:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      {bookings.length === 0 ? (
        <div className="mvr-no-bookings">
          <p>No venue requests found.</p>
        </div>
      ) : (
        <>
          <div className="mvr-bookings-count">
            Showing {bookings.length} request{bookings.length !== 1 ? 's' : ''}
          </div>
          <div className="mvr-bookings-table-container">
          <table className="mvr-bookings-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Venue</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(booking => (
                <tr key={booking.id}>
                  <td>
                    <div className="mvr-event-name">{booking.event?.event_name || 'N/A'}</div>
                    {booking.event?.description && (
                      <div className="mvr-event-description">
                        {booking.event.description.substring(0, 50)}
                        {booking.event.description.length > 50 ? '...' : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="mvr-venue-info">
                      <div className="mvr-venue-name">{booking.venue?.name || 'N/A'}</div>
                      <div className="mvr-venue-code">{booking.venue?.code || ''}</div>
                    </div>
                  </td>
                  <td>
                    <div className="mvr-datetime-cell">
                      <div>{formatDateTime(booking.requested_start_datetime)}</div>
                      <div className="mvr-datetime-to">to</div>
                      <div>{formatDateTime(booking.requested_end_datetime)}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`mvr-status-badge ${getStatusBadgeClass(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td>
                    <div className="mvr-datetime-cell">
                      <div>{formatDateTime(booking.created_at)}</div>
                    </div>
                  </td>
                  <td className="mvr-actions-cell">
                    <button 
                      onClick={() => handleViewDetails(booking.id)}
                      className="mvr-action-button mvr-view-button"
                      title="View Details"
                    >
                      👁️
                    </button>
                    {booking.status === 'pending' && (
                      <button 
                        onClick={() => handleCancelBooking(booking.id, booking.event?.event_name)}
                        className="mvr-action-button mvr-delete-button"
                        title="Cancel Request"
                      >
                        ❌
                      </button>
                    )}
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

export default MyVenueRequestsPage;
