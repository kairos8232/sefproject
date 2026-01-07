import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './FacultyBookingRequestsPage.css';

const FacultyBookingRequestsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]); // Store all bookings for client-side filtering
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [adjustTime, setAdjustTime] = useState(false);
  const [adjustedStartTime, setAdjustedStartTime] = useState('');
  const [adjustedEndTime, setAdjustedEndTime] = useState('');
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Filters and sorting
  const [statusFilter, setStatusFilter] = useState('pending');
  const [venueFilter, setVenueFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const navigate = useNavigate();

  const fetchBookings = useCallback(async () => {
    try {
      console.log('[FacultyBookingRequests] Fetching bookings...');
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('[FacultyBookingRequests] No token found, redirecting to login');
        navigate('/login');
        return;
      }

      const params = new URLSearchParams();
      if (sortBy) params.append('sort_by', sortBy);
      if (sortOrder) params.append('sort_order', sortOrder);

      const url = `http://localhost:5001/api/venue-bookings/faculty/requests?${params}`;
      console.log('[FacultyBookingRequests] Fetching from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[FacultyBookingRequests] Response status:', response.status);
      const data = await response.json();
      console.log('[FacultyBookingRequests] Response data:', data);

      if (!response.ok) {
        console.error('[FacultyBookingRequests] Error response:', data);
        throw new Error(data.error || 'Failed to fetch booking requests');
      }

      console.log('[FacultyBookingRequests] Successfully loaded', data.bookings?.length || 0, 'bookings');
      console.log('[FacultyBookingRequests] First booking structure:', JSON.stringify(data.bookings?.[0], null, 2));
      setAllBookings(data.bookings || []);
    } catch (err) {
      console.error('[FacultyBookingRequests] Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, navigate]);

  // Client-side filtering for status, venue and search
  useEffect(() => {
    const filtered = allBookings.filter(booking => {
      const matchesStatus = !statusFilter || statusFilter === 'all' || booking.status === statusFilter;
      const matchesVenue = !venueFilter || booking.venue_id === venueFilter;
      const matchesSearch = !searchQuery || 
        booking.event_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.organizer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.venue?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesVenue && matchesSearch;
    });
    setBookings(filtered);
  }, [allBookings, statusFilter, venueFilter, searchQuery]);

  const fetchVenues = useCallback(async () => {
    try {
      console.log('[FacultyBookingRequests] Fetching venues...');
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/venues', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[FacultyBookingRequests] Venues response status:', response.status);
      const data = await response.json();
      console.log('[FacultyBookingRequests] Venues data:', data);
      if (response.ok) {
        console.log('[FacultyBookingRequests] Successfully loaded', data.venues?.length || 0, 'venues');
        setVenues(data.venues || []);
      } else {
        console.error('[FacultyBookingRequests] Failed to fetch venues:', data);
      }
    } catch (err) {
      console.error('[FacultyBookingRequests] Fetch venues error:', err);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchVenues();
  }, [fetchBookings, fetchVenues]);

  const handleViewDetails = (booking) => {
    navigate(`/faculty/bookings/${booking.id}`);
  };

  const handleApprove = async () => {
    if (!selectedBooking) return;

    try {
      setProcessing(true);
      const token = localStorage.getItem('token');

      const requestBody = {
        approval_notes: approvalNotes || null
      };

      // Only include adjusted times if the checkbox is checked
      if (adjustTime) {
        requestBody.approved_start_datetime = adjustedStartTime;
        requestBody.approved_end_datetime = adjustedEndTime;
      }

      const response = await fetch(`http://localhost:5001/api/venue-bookings/${selectedBooking.id}/approve-request`, {
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

      setSuccessMessage('✅ Booking request approved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      closeModal();
      fetchBookings();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBooking || !rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    if (rejectionReason.trim().length < 10) {
      setError('Rejection reason must be at least 10 characters');
      return;
    }

    try {
      setProcessing(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`http://localhost:5001/api/venue-bookings/${selectedBooking.id}/reject-request`, {
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
      setTimeout(() => setSuccessMessage(''), 3000);
      
      closeModal();
      fetchBookings();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
    setIsRejecting(false);
    setRejectionReason('');
    setApprovalNotes('');
    setAdjustTime(false);
    setAdjustedStartTime('');
    setAdjustedEndTime('');
    setError(null);
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

  const formatDate = (datetime) => {
    if (!datetime) return 'N/A';
    const date = new Date(datetime);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (datetime) => {
    if (!datetime) return 'N/A';
    const date = new Date(datetime);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateRange = (startDatetime, endDatetime) => {
    if (!startDatetime || !endDatetime) return 'N/A';
    
    const start = new Date(startDatetime);
    const end = new Date(endDatetime);
    
    // Check if it's the same day
    const sameDay = start.toDateString() === end.toDateString();
    
    if (sameDay) {
      return formatDate(startDatetime);
    } else {
      // Multi-day event
      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startStr} - ${endStr}`;
    }
  };

  const getTimeAgo = (datetime) => {
    if (!datetime) return '';
    const now = new Date();
    const past = new Date(datetime);
    const diffInMs = now - past;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays > 0) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    if (diffInHours > 0) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInMinutes > 0) return `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="faculty-booking-requests-page">
      <div className="page-header">
        <div>
          <h1>🏢 Venue Booking Requests</h1>
          <p>Review and manage venue booking requests for your faculty</p>
        </div>
        <button onClick={() => navigate('/home')} className="back-button">
          ← Back to Home
        </button>
      </div>

      {successMessage && <div className="success-message">{successMessage}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="filters-section">
        <h3>🔍 Filters & Search</h3>
        <div className="filter-row">
          <div className="filter-group">
            <label>Status:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Venue:</label>
            <select value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)}>
              <option value="">All Venues</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>{venue.name} ({venue.code})</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="created_at">Submission Date</option>
              <option value="requested_start_datetime">Event Date</option>
              <option value="status">Status</option>
            </select>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Event name or requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading booking requests...</div>
      ) : bookings.length === 0 ? (
        <div className="no-data">No booking requests found</div>
      ) : (
        <div className="bookings-table">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Event Name</th>
                <th>Requester</th>
                <th>Venue</th>
                <th>Date & Time</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(booking => (
                <tr key={booking.id}>
                  <td>{getStatusBadge(booking.status)}</td>
                  <td className="event-name">{booking.event?.event_name || 'N/A'}</td>
                  <td>
                    <div className="requester-info">
                      <div>{booking.requester?.name || 'N/A'}</div>
                      <div className="role-badge">{booking.requester?.role || ''}</div>
                    </div>
                  </td>
                  <td className="venue-name">{booking.venue?.name || 'N/A'}</td>
                  <td>
                    <div className="datetime-info">
                      <div>{formatDateRange(booking.requested_start_datetime, booking.requested_end_datetime)}</div>
                      <div className="time-range">
                        {formatTime(booking.requested_start_datetime)} - {formatTime(booking.requested_end_datetime)}
                      </div>
                    </div>
                  </td>
                  <td className="time-ago">{getTimeAgo(booking.created_at)}</td>
                  <td>
                    <button 
                      className="btn-view-details"
                      onClick={() => handleViewDetails(booking)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showModal && selectedBooking && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Booking Request Details</h2>
              <button className="close-button" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Event Information</h3>
                <div className="detail-row">
                  <label>Event Name:</label>
                  <span>{selectedBooking.event?.event_name || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <label>Event Type:</label>
                  <span>{selectedBooking.event?.event_type || 'N/A'}</span>
                </div>
                {selectedBooking.event?.description && (
                  <div className="detail-row">
                    <label>Description:</label>
                    <span>{selectedBooking.event.description}</span>
                  </div>
                )}
                <div className="detail-row">
                  <label>Organizer:</label>
                  <span>{selectedBooking.event?.organizer?.name} ({selectedBooking.event?.organizer?.email})</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Requester Information</h3>
                <div className="detail-row">
                  <label>Name:</label>
                  <span>{selectedBooking.requester?.name || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <label>Email:</label>
                  <span>{selectedBooking.requester?.email || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <label>Role:</label>
                  <span className="role-badge">{selectedBooking.requester?.role || 'N/A'}</span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Status</h3>
                <div className="detail-row">
                  <label>Current Status:</label>
                  {getStatusBadge(selectedBooking.status)}
                </div>
                {selectedBooking.status !== 'pending' && selectedBooking.approver && (
                  <>
                    <div className="detail-row">
                      <label>Processed By:</label>
                      <span>{selectedBooking.approver.name}</span>
                    </div>
                    <div className="detail-row">
                      <label>Processed At:</label>
                      <span>{formatDateTime(selectedBooking.approved_at)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="detail-section">
                <h3>Requested Details</h3>
                <div className="detail-row">
                  <label>Venue:</label>
                  <span>{selectedBooking.venue?.name} ({selectedBooking.venue?.code})</span>
                </div>
                <div className="detail-row">
                  <label>Capacity:</label>
                  <span>{selectedBooking.venue?.capacity} people</span>
                </div>
                <div className="detail-row">
                  <label>Location:</label>
                  <span>{selectedBooking.venue?.location}</span>
                </div>
                <div className="detail-row">
                  <label>Date:</label>
                  <span>{formatDate(selectedBooking.requested_start_datetime)}</span>
                </div>
                <div className="detail-row">
                  <label>Time:</label>
                  <span>{formatTime(selectedBooking.requested_start_datetime)} - {formatTime(selectedBooking.requested_end_datetime)}</span>
                </div>
                {selectedBooking.setup_time > 0 && (
                  <div className="detail-row">
                    <label>Setup Time:</label>
                    <span>{selectedBooking.setup_time} minutes before</span>
                  </div>
                )}
                {selectedBooking.teardown_time > 0 && (
                  <div className="detail-row">
                    <label>Teardown Time:</label>
                    <span>{selectedBooking.teardown_time} minutes after</span>
                  </div>
                )}
                {selectedBooking.expected_attendees && (
                  <div className="detail-row">
                    <label>Expected Attendees:</label>
                    <span>{selectedBooking.expected_attendees} people</span>
                  </div>
                )}
              </div>

              {selectedBooking.remarks && (
                <div className="detail-section">
                  <h3>Requester Notes</h3>
                  <p className="remarks-text">{selectedBooking.remarks}</p>
                </div>
              )}

              {selectedBooking.rejection_reason && (
                <div className="detail-section rejection-section">
                  <h3>Rejection Reason</h3>
                  <p className="rejection-text">{selectedBooking.rejection_reason}</p>
                </div>
              )}

              {selectedBooking.approval_notes && (
                <div className="detail-section approval-section">
                  <h3>Approval Notes</h3>
                  <p className="approval-text">{selectedBooking.approval_notes}</p>
                </div>
              )}

              {selectedBooking.status === 'pending' && !isRejecting && (
                <div className="detail-section action-section">
                  <h3>Approve with Adjustments</h3>
                  
                  <div className="checkbox-group">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={adjustTime}
                        onChange={(e) => setAdjustTime(e.target.checked)}
                      />
                      Adjust time
                    </label>
                  </div>

                  {adjustTime && (
                    <div className="time-adjustment">
                      <div className="input-group">
                        <label>Start Time:</label>
                        <input 
                          type="datetime-local"
                          value={adjustedStartTime}
                          onChange={(e) => setAdjustedStartTime(e.target.value)}
                        />
                      </div>
                      <div className="input-group">
                        <label>End Time:</label>
                        <input 
                          type="datetime-local"
                          value={adjustedEndTime}
                          onChange={(e) => setAdjustedEndTime(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="input-group">
                    <label>Approval Notes (optional):</label>
                    <textarea 
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Add any notes or conditions for the approval..."
                      rows="3"
                    />
                  </div>

                  <div className="modal-actions">
                    <button 
                      className="btn-approve"
                      onClick={handleApprove}
                      disabled={processing}
                    >
                      {processing ? 'Processing...' : '✅ Approve'}
                    </button>
                    <button 
                      className="btn-reject"
                      onClick={() => setIsRejecting(true)}
                      disabled={processing}
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              )}

              {isRejecting && (
                <div className="detail-section rejection-form">
                  <h3>Rejection Reason *</h3>
                  <textarea 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejection (minimum 10 characters)..."
                    rows="4"
                    required
                  />
                  <div className="modal-actions">
                    <button 
                      className="btn-confirm-reject"
                      onClick={handleReject}
                      disabled={processing || rejectionReason.trim().length < 10}
                    >
                      {processing ? 'Processing...' : 'Confirm Reject'}
                    </button>
                    <button 
                      className="btn-cancel"
                      onClick={() => {
                        setIsRejecting(false);
                        setRejectionReason('');
                      }}
                      disabled={processing}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {selectedBooking.status !== 'pending' && (
                <div className="info-message">
                  ℹ️ This booking has already been {selectedBooking.status}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyBookingRequestsPage;
