import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import venueBookingService from '../services/venueBookingService';
import { formatDateTime } from '../utils/dateUtils';
import './VenueBookingDetailsPage.css';

function VenueBookingDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBookingDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await venueBookingService.getBookingById(id);
      setBooking(result.booking);
    } catch (err) {
      console.error('Load booking error:', err);
      setError(err.response?.data?.error || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
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
        <button onClick={() => navigate('/my-events')} className="vbd-back-button">
          Back to My Events
        </button>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="booking-details-container">
        <div className="vbd-error-message">Booking not found</div>
        <button onClick={() => navigate('/my-events')} className="vbd-back-button">
          Back to My Events
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
        <button onClick={() => navigate('/my-events')} className="vbd-back-button">
          Back to My Events
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
          <div className="vbd-details-grid">
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Venue Name:</span>
              <span className="vbd-detail-value">{booking.venue?.name || 'N/A'}</span>
            </div>
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Venue Code:</span>
              <span className="vbd-detail-value">{booking.venue?.code || 'N/A'}</span>
            </div>
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Location:</span>
              <span className="vbd-detail-value">{booking.venue?.location || 'N/A'}</span>
            </div>
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Capacity:</span>
              <span className="vbd-detail-value">{booking.venue?.capacity || 'N/A'} people</span>
            </div>
            <div className="vbd-detail-item">
              <span className="vbd-detail-label">Faculty:</span>
              <span className="vbd-detail-value">{booking.venue?.faculty?.name || 'N/A'}</span>
            </div>
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
            {booking.expected_attendees && (
              <div className="vbd-detail-item">
                <span className="vbd-detail-label">Expected Attendees:</span>
                <span className="vbd-detail-value">{booking.expected_attendees}</span>
              </div>
            )}
            {booking.setup_time > 0 && (
              <div className="vbd-detail-item">
                <span className="vbd-detail-label">Setup Time:</span>
                <span className="vbd-detail-value">{booking.setup_time} minutes</span>
              </div>
            )}
            {booking.teardown_time > 0 && (
              <div className="vbd-detail-item">
                <span className="vbd-detail-label">Teardown Time:</span>
                <span className="vbd-detail-value">{booking.teardown_time} minutes</span>
              </div>
            )}
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
