import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './FacultyBookingRequestDetailPage.css';

const FacultyBookingRequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Approval/Rejection forms
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [adjustTime, setAdjustTime] = useState(false);
  const [adjustedStartTime, setAdjustedStartTime] = useState('');
  const [adjustedEndTime, setAdjustedEndTime] = useState('');

  const fetchBookingDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`http://localhost:5001/api/venue-bookings/${id}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch booking details');
      }

      setBooking(data.booking);
      setAdjustedStartTime(data.booking.requested_start_datetime);
      setAdjustedEndTime(data.booking.requested_end_datetime);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  const handleApprove = async (e) => {
    e.preventDefault();
    
    if (adjustTime && (!adjustedStartTime || !adjustedEndTime)) {
      setError('Please provide adjusted start and end times');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      const token = localStorage.getItem('token');

      const requestBody = {
        approval_notes: approvalNotes || undefined
      };

      if (adjustTime) {
        requestBody.adjusted_start_datetime = adjustedStartTime;
        requestBody.adjusted_end_datetime = adjustedEndTime;
      }

      const response = await fetch(`http://localhost:5001/api/venue-bookings/${id}/approve-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve booking');
      }

      setSuccessMessage('✅ Booking request approved successfully!');
      setTimeout(() => {
        navigate('/faculty/bookings');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      setError('Please provide a detailed rejection reason (at least 10 characters)');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      const token = localStorage.getItem('token');

      const response = await fetch(`http://localhost:5001/api/venue-bookings/${id}/reject-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rejection_reason: rejectionReason })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject booking');
      }

      setSuccessMessage('❌ Booking request rejected');
      setTimeout(() => {
        navigate('/faculty/bookings');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: '🟡', label: 'Pending', class: 'status-pending' },
      approved: { icon: '🟢', label: 'Approved', class: 'status-approved' },
      rejected: { icon: '🔴', label: 'Rejected', class: 'status-rejected' },
      cancelled: { icon: '⚪', label: 'Cancelled', class: 'status-cancelled' }
    };
    
    const badge = badges[status] || badges.pending;
    return (
      <span className={`status-badge ${badge.class}`}>
        {badge.icon} {badge.label}
      </span>
    );
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

  if (loading) {
    return (
      <div className="faculty-booking-detail-page">
        <div className="loading">Loading booking details...</div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="faculty-booking-detail-page">
        <div className="page-header">
          <div>
            <h1>Booking Request Details</h1>
            <p>Review and manage venue booking request</p>
          </div>
          <button onClick={() => navigate('/faculty/bookings')} className="back-button">
            ← Back to Requests
          </button>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="faculty-booking-detail-page">
        <div className="page-header">
          <div>
            <h1>Booking Request Details</h1>
            <p>Review and manage venue booking request</p>
          </div>
          <button onClick={() => navigate('/faculty/bookings')} className="back-button">
            ← Back to Requests
          </button>
        </div>
        <div className="error-message">Booking request not found</div>
      </div>
    );
  }

  return (
    <div className="faculty-booking-detail-page">
      <div className="page-header">
        <div>
          <h1>Booking Request Details</h1>
          <p>Review and manage venue booking request</p>
        </div>
        <button onClick={() => navigate('/faculty/bookings')} className="back-button">
          ← Back to Requests
        </button>
      </div>

      {successMessage && <div className="success-message">{successMessage}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Booking Header */}
      <div className="booking-header">
        <h1>{booking.event?.event_name || 'Booking Request'}</h1>
        <div className="header-badges">
          {getStatusBadge(booking.status)}
          <span className="role-badge">{booking.requester?.role || 'N/A'}</span>
        </div>
      </div>

      {/* Event Information */}
      <div className="detail-section">
        <h2>📅 Event Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Event Name</label>
            <p>{booking.event?.event_name || 'N/A'}</p>
          </div>
          <div className="info-item">
            <label>Description</label>
            <p>{booking.event?.description || 'No description provided'}</p>
          </div>
          <div className="info-item">
            <label>Expected Attendees</label>
            <p>{booking.expected_attendees || 'Not specified'}</p>
          </div>
          <div className="info-item">
            <label>Start Date & Time</label>
            <p>{formatDateTime(booking.requested_start_datetime)}</p>
          </div>
          <div className="info-item">
            <label>End Date & Time</label>
            <p>{formatDateTime(booking.requested_end_datetime)}</p>
          </div>
        </div>
      </div>

      {/* Requester Information */}
      <div className="detail-section">
        <h2>👤 Requester Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Name</label>
            <p>{booking.requester?.name || 'N/A'}</p>
          </div>
          <div className="info-item">
            <label>Email</label>
            <p>{booking.requester?.email || 'N/A'}</p>
          </div>
          <div className="info-item">
            <label>Role</label>
            <p className="role-badge">{booking.requester?.role || 'N/A'}</p>
          </div>
          <div className="info-item">
            <label>Submitted On</label>
            <p>{formatDateTime(booking.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Venue Information */}
      <div className="detail-section">
        <h2>🏢 Venue Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Venue Name</label>
            <p>{booking.venue?.name || 'N/A'}</p>
          </div>
          <div className="info-item">
            <label>Venue Code</label>
            <p>{booking.venue?.code || 'N/A'}</p>
          </div>
          <div className="info-item">
            <label>Capacity</label>
            <p>{booking.venue?.capacity || 'N/A'} people</p>
          </div>
          <div className="info-item">
            <label>Location</label>
            <p>{booking.venue?.location || 'N/A'}</p>
          </div>
          <div className="info-item">
            <label>Faculty</label>
            <p>{booking.venue?.faculty?.name || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Requested Time */}
      <div className="detail-section">
        <h2>⏰ Requested Time</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Start Date & Time</label>
            <p>{formatDateTime(booking.requested_start_datetime)}</p>
          </div>
          <div className="info-item">
            <label>End Date & Time</label>
            <p>{formatDateTime(booking.requested_end_datetime)}</p>
          </div>
          {booking.setup_time && (
            <div className="info-item">
              <label>Setup Time</label>
              <p>{booking.setup_time} minutes</p>
            </div>
          )}
          {booking.teardown_time && (
            <div className="info-item">
              <label>Teardown Time</label>
              <p>{booking.teardown_time} minutes</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Information */}
      {booking.remarks && (
        <div className="detail-section">
          <h2>📝 Additional Remarks</h2>
          <div className="remarks-box">
            <p>{booking.remarks}</p>
          </div>
        </div>
      )}

      {/* Approval/Rejection Information */}
      {booking.status !== 'pending' && (
        <div className="detail-section">
          <h2>
            {booking.status === 'approved' ? '✅ Approval Information' : '❌ Rejection Information'}
          </h2>
          <div className="info-grid">
            <div className="info-item">
              <label>{booking.status === 'approved' ? 'Approved By' : 'Rejected By'}</label>
              <p>{booking.approver?.name || 'N/A'}</p>
              <small>{booking.approver?.email}</small>
            </div>
            <div className="info-item">
              <label>{booking.status === 'approved' ? 'Approved At' : 'Rejected At'}</label>
              <p>{formatDateTime(booking.approved_at)}</p>
            </div>
            {booking.status === 'approved' && booking.approval_notes && (
              <div className="info-item full-width">
                <label>Approval Notes</label>
                <p>{booking.approval_notes}</p>
              </div>
            )}
            {booking.status === 'rejected' && booking.rejection_reason && (
              <div className="info-item full-width">
                <label>Rejection Reason</label>
                <p>{booking.rejection_reason}</p>
              </div>
            )}
            {booking.approved_start_datetime && (
              <>
                <div className="info-item">
                  <label>Approved Start Time</label>
                  <p>{formatDateTime(booking.approved_start_datetime)}</p>
                </div>
                <div className="info-item">
                  <label>Approved End Time</label>
                  <p>{formatDateTime(booking.approved_end_datetime)}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Action Forms (only for pending bookings) */}
      {booking.status === 'pending' && (
        <div className="action-section">
          <div className="action-toggle">
            <button 
              className={`toggle-btn ${!isRejecting ? 'active' : ''}`}
              onClick={() => setIsRejecting(false)}
            >
              ✅ Approve Request
            </button>
            <button 
              className={`toggle-btn ${isRejecting ? 'active' : ''}`}
              onClick={() => setIsRejecting(true)}
            >
              ❌ Reject Request
            </button>
          </div>

          {!isRejecting ? (
            <form onSubmit={handleApprove} className="action-form approval-form">
              <h3>Approve Booking Request</h3>
              
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={adjustTime}
                    onChange={(e) => setAdjustTime(e.target.checked)}
                  /> Adjust requested time
                </label>
              </div>

              {adjustTime && (
                <div className="time-adjustment">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Adjusted Start Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={adjustedStartTime ? new Date(adjustedStartTime).toISOString().slice(0, 16) : ''}
                        onChange={(e) => setAdjustedStartTime(e.target.value)}
                        required={adjustTime}
                      />
                    </div>
                    <div className="form-group">
                      <label>Adjusted End Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={adjustedEndTime ? new Date(adjustedEndTime).toISOString().slice(0, 16) : ''}
                        onChange={(e) => setAdjustedEndTime(e.target.value)}
                        required={adjustTime}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Approval Notes (Optional)</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes or conditions for the approval..."
                  rows="4"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-approve" disabled={processing}>
                  {processing ? 'Processing...' : '✅ Approve Booking'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleReject} className="action-form rejection-form">
              <h3>Reject Booking Request</h3>
              
              <div className="form-group">
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

              <div className="form-actions">
                <button type="submit" className="btn-reject" disabled={processing}>
                  {processing ? 'Processing...' : '❌ Reject Booking'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default FacultyBookingRequestDetailPage;
