import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import './FacultyBookingRequestDetailPage.css';

const FacultyBookingRequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  // Approval/Rejection forms
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');

  const fetchBookingDetails = useCallback(async () => {
    document.title = 'Booking Request Details - CESMS';
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await authFetch(`/venue-bookings/${id}/details`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch booking details');
      }

      setBooking(data.booking);
    } catch (err) {
      setError(err.message);
      toast.showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  const handleApprove = async (e) => {
    e.preventDefault();
    
    try {
      setProcessing(true);
      setError(null);
      const requestBody = {
        approval_notes: approvalNotes || undefined
      };

      const response = await authFetch(`/venue-bookings/${id}/approve-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve booking');
      }

      toast.showSuccess('Booking request approved successfully!');
      setTimeout(() => {
        navigate('/faculty/bookings');
      }, 2000);
    } catch (err) {
      toast.showError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      toast.showError('Please provide a detailed rejection reason (at least 10 characters)');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      const response = await authFetch(`/venue-bookings/${id}/reject-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rejection_reason: rejectionReason })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject booking');
      }

      toast.showSuccess('Booking request rejected successfully!');
      setTimeout(() => {
        navigate('/faculty/bookings');
      }, 2000);
    } catch (err) {
      toast.showError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return 'N/A';
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
      <div className="fbrd-container">
        <div className="fbrd-loading">Loading booking details...</div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="fbrd-container">
        <div className="fbrd-header">
          <div>
            <h1>Booking Request Details</h1>
            <p>Review and manage venue booking request</p>
          </div>
          <button onClick={() => navigate('/faculty/bookings')} className="fbrd-back-button">
            Back to Requests
          </button>
        </div>
        <div className="fbrd-error-message">{error}</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="fbrd-container">
        <div className="fbrd-header">
          <div>
            <h1>Booking Request Details</h1>
            <p>Review and manage venue booking request</p>
          </div>
          <button onClick={() => navigate('/faculty/bookings')} className="fbrd-back-button">
            Back to Requests
          </button>
        </div>
        <div className="fbrd-error-message">Booking request not found</div>
      </div>
    );
  }

  return (
    <div className="fbrd-container">
      <div className="fbrd-header">
        <div>
          <h1>Booking Request Details</h1>
          <p>Review and manage venue booking request</p>
        </div>
        <button onClick={() => navigate('/faculty/bookings')} className="fbrd-back-button">
          Back to Requests
        </button>
      </div>

      {error && <div className="fbrd-error-message">{error}</div>}

      <div className="fbrd-content">
        {/* Booking Header */}
        <div className="fbrd-booking-header">
          <h2>{booking.event?.event_name || 'Booking Request'}</h2>
          <div className="fbrd-header-badges">
            <span className={`fbrd-status-badge fbrd-status-${booking.status}`}>
              {booking.status}
            </span>
          </div>
        </div>

        {/* Event Information */}
        <div className="fbrd-details-section">
          <h2>📅 Event Information</h2>
          <div className="fbrd-info-row">
            <div className="fbrd-info-item">
              <label>Event Name</label>
              <p>{booking.event?.event_name || 'N/A'}</p>
            </div>
            <div className="fbrd-info-item">
              <label>Event Description</label>
              <p>{booking.event?.description || 'No description provided'}</p>
            </div>
          </div>
          <div className="fbrd-info-row">
            <div className="fbrd-info-item">
              <label>Event Start</label>
              <p>{formatDateTime(booking.event?.start_datetime)}</p>
            </div>
            <div className="fbrd-info-item">
              <label>Event End</label>
              <p>{formatDateTime(booking.event?.end_datetime)}</p>
            </div>
          </div>
        </div>

        {/* Venue Information */}
        <div className="fbrd-details-section">
          <h2>🏢 Venue Information</h2>
          <div className="fbrd-info-row">
            <div className="fbrd-info-item">
              <label>Venue Name</label>
              <p>{booking.venue?.name || 'N/A'}</p>
            </div>
            <div className="fbrd-info-item">
              <label>Venue Code</label>
              <p>{booking.venue?.code || 'N/A'}</p>
            </div>
          </div>
          <div className="fbrd-info-row">
            <div className="fbrd-info-item">
              <label>Location</label>
              <p>{booking.venue?.location || 'N/A'}</p>
            </div>
            <div className="fbrd-info-item">
              <label>Faculty</label>
              <p>{booking.venue?.faculty?.name || 'N/A'}</p>
            </div>
          </div>
          <div className="fbrd-info-row">
            <div className="fbrd-info-item">
              <label>Capacity</label>
              <p>{booking.venue?.capacity || 'N/A'} people</p>
            </div>
            <div className="fbrd-info-item"></div>
          </div>
        </div>

        {/* Booking Details */}
        <div className="fbrd-details-section">
          <h2>⏰ Booking Details</h2>
          <div className="fbrd-info-row">
            <div className="fbrd-info-item">
              <label>Requested Start</label>
              <p>{formatDateTime(booking.requested_start_datetime)}</p>
            </div>
            <div className="fbrd-info-item">
              <label>Requested End</label>
              <p>{formatDateTime(booking.requested_end_datetime)}</p>
            </div>
          </div>
          <div className="fbrd-info-row">
            <div className="fbrd-info-item">
              <label>Setup Time</label>
              <p>{formatTimeDuration(booking.setup_time)}</p>
            </div>
            <div className="fbrd-info-item">
              <label>Teardown Time</label>
              <p>{formatTimeDuration(booking.teardown_time)}</p>
            </div>
          </div>
          <div className="fbrd-info-row">
            <div className="fbrd-info-item">
              <label>Expected Attendees</label>
              <p>{booking.expected_attendees || 'Not specified'}</p>
            </div>
            <div className="fbrd-info-item"></div>
          </div>
          {booking.remarks && (
            <div className="fbrd-remarks-box">
              <p><strong>Notes/Remarks:</strong> {booking.remarks}</p>
            </div>
          )}
        </div>

        {/* Requester Information */}
        <div className="fbrd-details-section">
          <h2>👤 Requester Information</h2>
          <div className="fbrd-info-row">
            <div className="fbrd-info-item">
              <label>Name</label>
              <p>{booking.requester?.name || 'N/A'}</p>
            </div>
            <div className="fbrd-info-item">
              <label>Email</label>
              <p>{booking.requester?.email || 'N/A'}</p>
            </div>
          </div>
          <div className="fbrd-info-row">
            <div className="fbrd-info-item">
              <label>Role</label>
              <p>{booking.requester?.role?.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'N/A'}</p>
            </div>
            <div className="fbrd-info-item">
              <label>Submitted On</label>
              <p>{formatDateTime(booking.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Approval/Rejection Information */}
        {booking.status === 'approved' && (
          <div className="fbrd-success-section">
            <h2>✅ Approval Information</h2>
            <div className="fbrd-info-row">
              <div className="fbrd-info-item">
                <label>Approved By</label>
                <p>{booking.approver?.name || 'N/A'}</p>
              </div>
              <div className="fbrd-info-item">
                <label>Approved At</label>
                <p>{formatDateTime(booking.approved_at)}</p>
              </div>
            </div>
            {booking.approval_notes && (
              <div className="fbrd-remarks-box">
                <p><strong>Approval Notes:</strong> {booking.approval_notes}</p>
              </div>
            )}
            {booking.approved_start_datetime && (
              <div className="fbrd-info-row">
                <div className="fbrd-info-item">
                  <label>Approved Start Time</label>
                  <p>{formatDateTime(booking.approved_start_datetime)}</p>
                </div>
                <div className="fbrd-info-item">
                  <label>Approved End Time</label>
                  <p>{formatDateTime(booking.approved_end_datetime)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {booking.status === 'rejected' && (
          <div className="fbrd-error-section">
            <h2>❌ Rejection Information</h2>
            <div className="fbrd-info-row">
              <div className="fbrd-info-item">
                <label>Rejected By</label>
                <p>{booking.approver?.name || 'N/A'}</p>
              </div>
              <div className="fbrd-info-item">
                <label>Rejected At</label>
                <p>{formatDateTime(booking.approved_at)}</p>
              </div>
            </div>
            {booking.rejection_reason && (
              <div className="fbrd-remarks-box">
                <p><strong>Rejection Reason:</strong> {booking.rejection_reason}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Forms (only for pending bookings) */}
        {booking.status === 'pending' && (
          <div className="fbrd-action-section">
            <div className="fbrd-action-toggle">
              <button 
                className={`fbrd-toggle-btn ${!isRejecting ? 'active' : ''}`}
                onClick={() => setIsRejecting(false)}
              >
                ✅ Approve Request
              </button>
              <button 
                className={`fbrd-toggle-btn ${isRejecting ? 'active' : ''}`}
                onClick={() => setIsRejecting(true)}
              >
                ❌ Reject Request
              </button>
            </div>

            {!isRejecting ? (
              <form onSubmit={handleApprove} className="fbrd-action-form">
                <h3>Approve Booking Request</h3>
                
                <div className="fbrd-form-group">
                  <label>Approval Notes (Optional)</label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Add any notes or conditions for the approval..."
                    rows="4"
                  />
                </div>

                <div className="fbrd-form-actions">
                  <button type="submit" className="fbrd-btn-approve" disabled={processing}>
                    {processing ? 'Processing...' : '✅ Approve Booking'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleReject} className="fbrd-action-form">
                <h3>Reject Booking Request</h3>
                
                <div className="fbrd-form-group">
                  <label>Rejection Reason *</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a detailed reason for rejection (minimum 10 characters)..."
                    rows="5"
                    required
                  />
                  <small>{rejectionReason.length}/10 characters minimum</small>
                </div>

                <div className="fbrd-form-actions">
                  <button type="submit" className="fbrd-btn-reject" disabled={processing}>
                    {processing ? 'Processing...' : '❌ Reject Booking'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyBookingRequestDetailPage;
