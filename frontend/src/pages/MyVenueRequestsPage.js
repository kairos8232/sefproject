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
  const navigate = useNavigate();

  const loadMyBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await venueBookingService.getMyBookings();
      let myBookings = result.bookings || [];

      // Apply status filter
      if (filter !== 'all') {
        myBookings = myBookings.filter(b => b.status === filter);
      }

      setBookings(myBookings);
    } catch (err) {
      console.error('Load bookings error:', err);
      setError(err.response?.data?.error || 'Failed to load venue requests');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadMyBookings();
  }, [loadMyBookings]);

  const handleViewDetails = (bookingId) => {
    navigate(`/venue-bookings/${bookingId}`);
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
        <label>Filter by status: </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Bookings Table */}
      {bookings.length === 0 ? (
        <div className="mvr-no-bookings">
          <p>No venue requests found.</p>
        </div>
      ) : (
        <div className="mvr-bookings-table-container">
          <table className="mvr-bookings-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Venue</th>
                <th>Requested Dates</th>
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
                  <td>{formatDateTime(booking.created_at)}</td>
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
      )}
    </div>
  );
}

export default MyVenueRequestsPage;
