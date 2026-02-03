import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import './FacultyBookingRequestsPage.css';

const FacultyBookingRequestsPage = () => {
  const { showError, showSuccess } = useToast();
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]); // Store all bookings for client-side filtering
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [adjustTime, setAdjustTime] = useState(false);
  const [adjustedStartTime, setAdjustedStartTime] = useState('');
  const [adjustedEndTime, setAdjustedEndTime] = useState('');
  const [processing, setProcessing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('pending');
  const [eventNameSearch, setEventNameSearch] = useState('');
  const [requesterSearch, setRequesterSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [venueSearch, setVenueSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const navigate = useNavigate();

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== '') params.append('status', statusFilter);

      const response = await authFetch(
        `/venue-bookings/faculty/requests?${params}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch booking requests');
      }

      setAllBookings(data.bookings || []);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, navigate, showError]);

  // Client-side filtering
  useEffect(() => {
    let filtered = allBookings;
    
    // Apply event name filter
    if (eventNameSearch.trim()) {
      filtered = filtered.filter(b => 
        b.event?.event_name?.toLowerCase().includes(eventNameSearch.toLowerCase())
      );
    }
    
    // Apply requester search filter
    if (requesterSearch.trim()) {
      filtered = filtered.filter(b => 
        b.requester?.name?.toLowerCase().includes(requesterSearch.toLowerCase())
      );
    }
    
    // Apply role filter
    if (roleFilter) {
      filtered = filtered.filter(b => b.requester?.role === roleFilter);
    }
    
    // Apply venue search filter
    if (venueSearch.trim()) {
      filtered = filtered.filter(b => 
        b.venue?.name?.toLowerCase().includes(venueSearch.toLowerCase()) ||
        b.venue?.code?.toLowerCase().includes(venueSearch.toLowerCase())
      );
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
        filtered = filtered.filter(b => {
          const start = new Date(b.requested_start_datetime);
          const end = new Date(b.requested_end_datetime);
          return start <= todayEnd && end >= today;
        });
      } else if (periodFilter === 'this-week') {
        filtered = filtered.filter(b => {
          const start = new Date(b.requested_start_datetime);
          const end = new Date(b.requested_end_datetime);
          return start < weekEnd && end >= today;
        });
      } else if (periodFilter === 'this-month') {
        filtered = filtered.filter(b => {
          const start = new Date(b.requested_start_datetime);
          const end = new Date(b.requested_end_datetime);
          return start <= monthEnd && end >= monthStart;
        });
      } else if (periodFilter === 'custom') {
        if (customStartDate || customEndDate) {
          filtered = filtered.filter(b => {
            const bookingStart = new Date(b.requested_start_datetime);
            const bookingEnd = new Date(b.requested_end_datetime);
            
            if (customStartDate && customEndDate) {
              const rangeStart = new Date(customStartDate);
              const rangeEnd = new Date(customEndDate);
              rangeEnd.setHours(23, 59, 59, 999);
              return bookingStart <= rangeEnd && bookingEnd >= rangeStart;
            } else if (customStartDate) {
              const rangeStart = new Date(customStartDate);
              return bookingEnd >= rangeStart;
            } else if (customEndDate) {
              const rangeEnd = new Date(customEndDate);
              rangeEnd.setHours(23, 59, 59, 999);
              return bookingStart <= rangeEnd;
            }
            return true;
          });
        }
      }
    }
    
    setBookings(filtered);
  }, [allBookings, eventNameSearch, requesterSearch, roleFilter, venueSearch, periodFilter, customStartDate, customEndDate]);

  const fetchVenues = useCallback(async () => {
    try {
      const response = await authFetch('/venues', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await response.json();
    } catch (err) {
    }
  }, []);

  useEffect(() => {
    document.title = 'Venue Booking Requests - CESMS';
    fetchBookings();
    fetchVenues();
  }, [fetchBookings, fetchVenues, statusFilter, eventNameSearch, requesterSearch, roleFilter, venueSearch, periodFilter, customStartDate, customEndDate]);

  const handleViewDetails = (booking) => {
    navigate(`/faculty/bookings/${booking.id}`);
  };

  const handleApprove = async () => {
    if (!selectedBooking) return;

    try {
      setProcessing(true);
      const requestBody = {
        approval_notes: approvalNotes || null
      };

      // Only include adjusted times if the checkbox is checked
      if (adjustTime) {
        requestBody.approved_start_datetime = adjustedStartTime;
        requestBody.approved_end_datetime = adjustedEndTime;
      }

      const response = await authFetch(`/venue-bookings/${selectedBooking.id}/approve-request`, {
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

      showSuccess('Booking request approved successfully');
      
      closeModal();
      fetchBookings();
    } catch (err) {
      showError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBooking || !rejectionReason.trim()) {
      showError('Rejection reason is required');
      return;
    }

    if (rejectionReason.trim().length < 10) {
      showError('Rejection reason must be at least 10 characters');
      return;
    }

    try {
      setProcessing(true);
      const response = await authFetch(`/venue-bookings/${selectedBooking.id}/reject-request`, {
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

      showSuccess('Booking request rejected');
      
      closeModal();
      fetchBookings();
    } catch (err) {
      showError(err.message);
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
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'fbrp-status-pending';
      case 'approved':
        return 'fbrp-status-approved';
      case 'rejected':
        return 'fbrp-status-rejected';
      case 'cancelled':
        return 'fbrp-status-cancelled';
      default:
        return '';
    }
  };

  const getRoleColorClass = (role) => {
    if (!role) return 'fbrp-role-default';
    switch (role.toLowerCase()) {
      case 'student':
        return 'fbrp-role-student';
      case 'faculty_staff':
        return 'fbrp-role-faculty';
      case 'event_organizer':
        return 'fbrp-role-organizer';
      default:
        return 'fbrp-role-default';
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: '🟡', label: 'Pending', class: 'fbrp-status-pending' },
      approved: { icon: '🟢', label: 'Approved', class: 'fbrp-status-approved' },
      rejected: { icon: '🔴', label: 'Rejected', class: 'fbrp-status-rejected' },
      cancelled: { icon: '⚪', label: 'Cancelled', class: 'fbrp-status-cancelled' }
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

  const groupedBookings = useMemo(() => {
    const groups = {};
    bookings.forEach(b => {
      const key = b.package_id || b.event_id || b.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    return Object.values(groups);
  }, [bookings]);

  return (
    <div className="faculty-booking-requests-page">
      <div className="fbrp-page-header">
        <div>
          <h1>🏢 Venue Booking Requests</h1>
          <p>Review and manage venue booking requests for your faculty</p>
        </div>
        <button onClick={() => navigate('/home')} className="fbrp-back-button">
          Back to Home
        </button>
      </div>

      <div className="fbrp-filter-section">
        <div className="fbrp-filter-group">
          <label>Event Name:</label>
          <input
            type="text"
            placeholder="Search event name..."
            value={eventNameSearch}
            onChange={(e) => setEventNameSearch(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '180px' }}
          />
        </div>
        
        <div className="fbrp-filter-group">
          <label>Requester:</label>
          <input
            type="text"
            placeholder="Search requester..."
            value={requesterSearch}
            onChange={(e) => setRequesterSearch(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '150px' }}
          />
        </div>
        
        <div className="fbrp-filter-group">
          <label>Role:</label>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="student">Student</option>
            <option value="faculty_staff">Faculty Staff</option>
            <option value="event_organizer">Event Organizer</option>
          </select>
        </div>
        
        <div className="fbrp-filter-group">
          <label>Venue:</label>
          <input
            type="text"
            placeholder="Search venue..."
            value={venueSearch}
            onChange={(e) => setVenueSearch(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '150px' }}
          />
        </div>
        
        <div className="fbrp-filter-group">
          <label>Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        <div className="fbrp-filter-group">
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
            <div className="fbrp-filter-group">
              <label>From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div className="fbrp-filter-group">
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
      </div>

      {loading ? (
        <div className="fbrp-loading">Loading booking requests...</div>
      ) : bookings.length === 0 ? (
        <div className="no-data">No booking requests found</div>
      ) : (
        <div className="fbrp-bookings-table-container">
          <table className="fbrp-bookings-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Requester</th>
                <th>Venue</th>
                <th>Status</th>
                <th>Date & Time</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupedBookings.map(group => {
                const first = group[0];
                const statuses = group.map(b => b.status);
                const allSame = statuses.every(s => s === statuses[0]);
                const groupStatus = allSame ? statuses[0] : 'mixed';

                return (
                  <tr key={first.id}>
                    <td className="fbrp-event-name-cell">
                      <div className="fbrp-event-name">{first.event?.event_name || 'N/A'}</div>
                      {first.event?.description && (
                        <div className="fbrp-event-description-preview">
                          {first.event.description.substring(0, 50)}
                          {first.event.description.length > 50 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="fbrp-requester-info">
                        <div className="fbrp-requester-name">{first.requester?.name || 'N/A'}</div>
                        {first.requester?.role && (
                          <div className={`fbrp-requester-role ${getRoleColorClass(first.requester.role)}`}>
                            {first.requester.role.replace('_', ' ').split(' ').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="fbrp-venue-info">
                        {group.map((booking, idx) => (
                          <div key={booking.id} className="fbrp-venue-name">
                            {idx + 1}. {booking.venue?.name || 'N/A'}
                            {booking.venue?.code ? ` (${booking.venue.code})` : ''}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`fbrp-status-badge ${getStatusBadgeClass(groupStatus)}`}>
                        {groupStatus}
                      </span>
                    </td>
                    <td className="fbrp-datetime-cell">
                      {group.map(booking => (
                        <div key={booking.id}>
                          <div>{formatDateTime(booking.requested_start_datetime)}</div>
                          <div className="fbrp-datetime-to">to</div>
                          <div>{formatDateTime(booking.requested_end_datetime)}</div>
                        </div>
                      ))}
                    </td>
                    <td className="fbrp-submitted-cell">{formatDateTime(first.created_at)}</td>
                    <td className="fbrp-actions-cell">
                      {group.map(booking => (
                        <button 
                          key={booking.id}
                          className="fbrp-action-button fbrp-view-button"
                          onClick={() => handleViewDetails(booking)}
                          title={`View ${booking.venue?.name || 'Details'}`}
                          style={{ marginBottom: '6px' }}
                        >
                          👁️
                        </button>
                      ))}
                    </td>
                  </tr>
                );
              })}
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
                  <span className="fbrp-role-badge">{selectedBooking.requester?.role || 'N/A'}</span>
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
