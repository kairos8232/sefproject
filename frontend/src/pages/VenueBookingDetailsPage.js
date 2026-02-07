import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import venueBookingService from '../services/venueBookingService';
import { formatDateTime } from '../utils/dateUtils';
import './VenueBookingDetailsPage.css';

function VenueBookingDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [booking, setBooking] = useState(null);
  const [groupedBookings, setGroupedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Determine where user came from
  const fromVenueRequests = location.state?.fromVenueRequests || false;
  const backPath = fromVenueRequests ? '/my-venue-requests' : '/my-events';
  const backText = fromVenueRequests ? 'Back to My Venue Requests' : 'Back to My Events';

  const loadBookingDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await venueBookingService.getBookingById(id);
      setBooking(result.booking);
      
      // If this booking has a package_id, fetch all bookings with that package
      if (result.booking?.package_id) {
        try {
          const allResult = await venueBookingService.getAllBookings();
          const grouped = allResult.bookings?.filter(b => b.package_id === result.booking.package_id) || [result.booking];
          setGroupedBookings(grouped);
        } catch (err) {
          // If getAllBookings fails, try getBookingsByEvent or just show the single booking
          if (result.booking?.event_id) {
            try {
              const eventResult = await venueBookingService.getBookingsByEvent(result.booking.event_id);
              const grouped = eventResult.bookings?.filter(b => b.package_id === result.booking.package_id) || [result.booking];
              setGroupedBookings(grouped);
            } catch (err2) {
              setGroupedBookings([result.booking]);
            }
          } else {
            setGroupedBookings([result.booking]);
          }
        }
      } else if (result.booking?.event_id) {
        // If no package_id but has event_id, fetch all bookings for that event
        try {
          const eventResult = await venueBookingService.getBookingsByEvent(result.booking.event_id);
          const grouped = eventResult.bookings || [result.booking];
          setGroupedBookings(grouped);
        } catch (err) {
          setGroupedBookings([result.booking]);
        }
      } else {
        setGroupedBookings([result.booking]);
      }
    } catch (err) {
      console.error('Load booking error:', err);
      setError(err.response?.data?.error || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    document.title = 'Venue Booking Details - CESMS';
    loadBookingDetails();
  }, [loadBookingDetails]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  // Format time duration in minutes to readable format
  const formatTimeDuration = (minutes) => {
    if (!minutes || minutes === 0) return 'N/A';
    
    const months = Math.floor(minutes / (30 * 24 * 60));
    const days = Math.floor((minutes % (30 * 24 * 60)) / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;
    
    const parts = [];
    if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (mins > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);
    
    return parts.join(' ') || 'N/A';
  };

  if (loading) {
    return (
      <div className="booking-details-container">
        <div className="vbd-loading">Loading booking details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-details-container">
        <div className="vbd-error-message">{error}</div>
        <button onClick={() => navigate(backPath)} className="vbd-back-button">
          {backText}
        </button>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="booking-details-container">
        <div className="vbd-error-message">Booking not found</div>
        <button onClick={() => navigate(backPath)} className="vbd-back-button">
          {backText}
        </button>
      </div>
    );
  }

  return (
    <div className="booking-details-container">
      <div className="booking-details-header">
        <div>
          <h1>Venue Booking Details</h1>
          <p>View your venue booking request status</p>
        </div>
        <button onClick={() => navigate(backPath)} className="vbd-back-button">
          {backText}
        </button>
      </div>

      <div className="booking-details-content">
        {/* Status Badge */}
        <div className="vbd-booking-header">
          <h2>Booking Request</h2>
          <span className={`status-badge ${getStatusBadgeClass(booking.status)}`}>
            {booking.status.toUpperCase()}
          </span>
        </div>

        {/* Event Information */}
        <div className="vbd-details-section">
          <h2>Event Information</h2>
          <div className="vbd-details-grid">
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Event Name:</span>
              <span className="vbd-detail-value">{booking.event?.event_name || 'N/A'}</span>
            </div>
            <div className="vbd-detail-item">
              {/* Empty slot */}
            </div>
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Event Start:</span>
              <span className="vbd-detail-value">{formatDateTime(booking.event?.start_datetime)}</span>
            </div>
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Event End:</span>
              <span className="vbd-detail-value">{formatDateTime(booking.event?.end_datetime)}</span>
            </div>
          </div>
        </div>

        {/* Venue Information */}
        <div className="vbd-details-section">
          <h2>Venue Information</h2>
          <div className="vbd-venue-list">
            {(groupedBookings.length > 0 ? groupedBookings : [booking]).map((b, idx) => (
              <div key={idx} className="vbd-venue-row">
                <div className="vbd-venue-info">
                  <div className="vbd-venue-name">{idx + 1}. {b.venue?.name || 'N/A'}</div>
                  <div className="vbd-venue-code">{b.venue?.code || 'N/A'}</div>
                </div>
                <div className="vbd-venue-meta">
                  <span>{b.venue?.location || 'N/A'}</span>
                  <span>{b.venue?.faculty?.name || 'N/A'}</span>
                  <span>{b.venue?.capacity || 'N/A'} people</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Details */}
        <div className="vbd-details-section">
          <h2>Booking Details</h2>
          <div className="vbd-details-grid">
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Requested Start:</span>
              <span className="vbd-detail-value">{formatDateTime(booking.requested_start_datetime)}</span>
            </div>
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Requested End:</span>
              <span className="vbd-detail-value">{formatDateTime(booking.requested_end_datetime)}</span>
            </div>
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Setup Time:</span>
              <span className="vbd-detail-value">{formatTimeDuration(booking.setup_time)}</span>
            </div>
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Teardown Time:</span>
              <span className="vbd-detail-value">{formatTimeDuration(booking.teardown_time)}</span>
            </div>
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Expected Attendees:</span>
              <span className="vbd-detail-value">{booking.expected_attendees || 'N/A'}</span>
            </div>
            {booking.remarks && (
              <div className="vbd-detail-item vbd-full-width">
                <span className="vbd-detail-label">Notes/Remarks:</span>
                <span className="vbd-detail-value">{booking.remarks}</span>
              </div>
            )}
          </div>
        </div>

        {/* Requester Information */}
        <div className="vbd-details-section">
          <h2>Request Information</h2>
          <div className="vbd-details-grid">
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Requested By:</span>
              <span className="vbd-detail-value">{booking.requester?.name || 'N/A'}</span>
            </div>
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Requested At:</span>
              <span className="vbd-detail-value">{formatDateTime(booking.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Approval/Rejection Information */}
        {booking.status === 'approved' && (
          <div className="details-section vbd-success-section">
            <h2>Approval Information</h2>
            <div className="vbd-details-grid">
              <div className="vbd-detail-item">
                <span className="vbd-detail-label">Approved By:</span>
                <span className="vbd-detail-value">{booking.approver?.name || 'N/A'}</span>
              </div>
              <div className="vbd-detail-item">
                <span className="vbd-detail-label">Approved At:</span>
                <span className="vbd-detail-value">{formatDateTime(booking.approved_at)}</span>
              </div>
              {booking.approval_notes && (
                <div className="vbd-detail-item vbd-full-width">
                  <span className="vbd-detail-label">Approval Notes:</span>
                  <span className="vbd-detail-value">{booking.approval_notes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {booking.status === 'rejected' && (
          <div className="details-section vbd-error-section">
            <h2>Rejection Information</h2>
            <div className="vbd-details-grid">
              {booking.rejection_reason && (
                <div className="vbd-detail-item vbd-full-width">
                  <span className="vbd-detail-label">Rejection Reason:</span>
                  <span className="vbd-detail-value">{booking.rejection_reason}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {booking.status === 'cancelled' && (
          <div className="vbd-details-section">
            <h2>Cancellation Information</h2>
            <div className="vbd-details-grid">
              {booking.cancellation_reason && (
                <div className="vbd-detail-item vbd-full-width">
                  <span className="vbd-detail-label">Cancellation Reason:</span>
                  <span className="vbd-detail-value">{booking.cancellation_reason}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VenueBookingDetailsPage;
