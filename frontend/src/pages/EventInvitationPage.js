import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import invitationService from '../services/invitationService';
import eventService from '../services/eventService';
import venueBookingService from '../services/venueBookingService';
import { formatEventTimeRange } from '../utils/eventTimeUtils';
import './EventInvitationPage.css';

const EventInvitationPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();

  const [event, setEvent] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [invitableUsers, setInvitableUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statistics, setStatistics] = useState({ total: 0, pending: 0, accepted: 0, declined: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [approvedBooking, setApprovedBooking] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch event details
      const eventData = await eventService.getEventById(eventId);
      setEvent(eventData);

      // Fetch invitations
      const invitationsData = await invitationService.getEventInvitations(eventId);
      setInvitations(invitationsData);

      // Fetch invitable users
      const usersData = await invitationService.getInvitableUsers(eventId);
      setInvitableUsers(usersData);

      // Fetch statistics
      const statsData = await invitationService.getStatistics(eventId);
      setStatistics(statsData);

      // Fetch venue bookings for gating and schedule display
      const bookingsData = await venueBookingService.getBookingsByEvent(eventId);
      const bookingList = bookingsData.bookings || bookingsData || [];
      setBookings(bookingList);
      const approved = bookingList.find((b) => b.status === 'approved') || null;
      setApprovedBooking(approved);
    } catch (err) {
      showError(err.message || 'Failed to load invitation data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, showError]);

  useEffect(() => {
    fetchData();
    if (location?.state?.message) {
      showSuccess(location.state.message);
    }
  }, [fetchData, location?.state?.message, showSuccess]);

  const handleSelectUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = (filtered) => {
    if (selectedUserIds.length === filtered.length && filtered.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filtered.map((user) => user.id));
    }
  };

  const handleSendInvitations = async () => {
    if (selectedUserIds.length === 0) {
      showError('Please select at least one user to invite');
      return;
    }

    try {
      setSending(true);

      await invitationService.inviteUsers(eventId, selectedUserIds);

      showSuccess(`Successfully invited ${selectedUserIds.length} user(s)`);
      setSelectedUserIds([]);

      // Refresh data
      setTimeout(() => fetchData(), 500);
    } catch (err) {
      showError(err.message || 'Failed to send invitations');
      console.error('Error sending invitations:', err);
    } finally {
      setSending(false);
    }
  };

  const handleRevokeInvitation = async (invitationId) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) {
      return;
    }

    try {
      await invitationService.revokeInvitation(invitationId);
      showSuccess('Invitation revoked successfully');

      // Refresh data
      setTimeout(() => fetchData(), 500);
    } catch (err) {
      showError(err.message || 'Failed to revoke invitation');
      console.error('Error revoking invitation:', err);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'accepted':
        return 'status-badge status-accepted';
      case 'declined':
        return 'status-badge status-declined';
      case 'pending':
      default:
        return 'status-badge status-pending';
    }
  };

  const filteredInvitations = invitations.filter((inv) => {
    const matchesSearch =
      inv.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.user?.staff_id?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || inv.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredInvitableUsers = invitableUsers.filter((user) =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.staff_id?.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="invitation-page loading">Loading invitation data...</div>;
  }

  if (!event) {
    return (
      <div className="invitation-page error">
        <p>Event not found</p>
        <button onClick={() => navigate('/my-events')} className="btn btn-primary">
          Back to My Events
        </button>
      </div>
    );
  }

  return (
    <div className="invitation-page">
      <div className="invitation-header">
        <div>
          <h1>Manage Invitations</h1>
          <p className="header-description">Manage who gets invited to your event</p>
          <p className="event-title">{event.event_name || event.title}</p>
        </div>
        <button onClick={() => navigate('/my-events')} className="header-back-button">
          ← Back
        </button>
      </div>

      <div className="invitation-container">
        {/* Event Schedule Card */}
        <div className="schedule-card">
          <div className="schedule-row">
            <span className="schedule-label">Venue</span>
            <span className="schedule-value">
              {approvedBooking?.venue?.name || approvedBooking?.venue_name || (bookings.length === 0 ? 'No booking' : 'Pending approval')}
            </span>
          </div>
          <div className="schedule-row">
            <span className="schedule-label">Time</span>
            <span className="schedule-value">
              {formatEventTimeRange(
                event.start_datetime,
                event.end_datetime,
                approvedBooking?.setup_time || 0,
                approvedBooking?.teardown_time || 0
              )}
            </span>
          </div>
        </div>

        {/* Statistics */}
        <div className="statistics-card">
          <div className="stat">
            <span className="stat-label">Total</span>
            <span className="stat-value">{statistics.total}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Pending</span>
            <span className="stat-value pending">{statistics.pending}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Accepted</span>
            <span className="stat-value accepted">{statistics.accepted}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Declined</span>
            <span className="stat-value declined">{statistics.declined}</span>
          </div>
        </div>

        {/* Invite New Users Section */}
        <div className="invite-section">
          <h2>Send New Invitations</h2>

          {/* Gating warnings */}
          {!approvedBooking && (
            <div className="alert alert-error" role="alert">
              {bookings.length === 0
                ? 'No venue booking found. Invitations cannot be sent.'
                : 'Venue booking is not approved yet. Invitations are disabled.'}
            </div>
          )}

          {invitableUsers.length === 0 ? (
            <p className="no-users-message">All eligible users have been invited</p>
          ) : (
            <div className="invite-form">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Filter by name, staff ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                </div>

                <div className="user-selection">
                  <div className="select-all-header">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.length === filteredInvitableUsers.length && filteredInvitableUsers.length > 0}
                        onChange={() => handleSelectAll(filteredInvitableUsers)}
                        className="select-all-checkbox"
                      />
                      Select All ({filteredInvitableUsers.length})
                    </label>
                  </div>

                  <div className="user-list">
                    {filteredInvitableUsers.map((user) => (
                      <div key={user.id} className="user-item">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                            className="user-checkbox"
                          />
                          <span className="user-info">
                            <span className="user-name">{user.name}</span>
                            <span className="user-email">{user.email}</span>
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="invite-actions">
                  <button
                    onClick={handleSendInvitations}
                    disabled={selectedUserIds.length === 0 || sending || !approvedBooking}
                    className="btn btn-primary"
                  >
                    {sending ? `Sending (${selectedUserIds.length})...` : `Send Invitations (${selectedUserIds.length})`}
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* Current Invitations Section */}
        <div className="invitations-section">
          <h2>Invitation Status</h2>

          <div className="filter-controls">
            <label className="filter-label">Filter by status:</label>
            <select
              value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All ({invitations.length})</option>
                <option value="pending">Pending ({statistics.pending})</option>
                <option value="accepted">Accepted ({statistics.accepted})</option>
                <option value="declined">Declined ({statistics.declined})</option>
              </select>
            </div>

            {filteredInvitations.length === 0 ? (
              <p className="no-invitations-message">
                {invitations.length === 0 ? 'No invitations sent yet' : 'No invitations match the selected filter'}
              </p>
            ) : (
              <div className="invitations-list">
                {filteredInvitations.map((invitation) => (
                  <div key={invitation.id} className="invitation-item">
                    <div className="invitation-user">
                      <div className="user-details">
                        <p className="user-name">
                          {invitation.user?.name}
                          {invitation.user?.staff_id ? ` - ${invitation.user.staff_id}` : ''}
                        </p>
                        <p className="user-email">{invitation.user?.email}</p>
                      </div>
                      <span className={getStatusBadgeClass(invitation.status)}>
                        {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                      </span>
                    </div>

                    <div className="invitation-meta">
                      <div className="sent-date">
                        <span>Sent: {new Date(invitation.created_at).toLocaleDateString()}</span>
                      </div>
                      {invitation.responded_at && (
                        <div className="responded-date">
                          <span>Responded: {new Date(invitation.responded_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {invitation.status === 'pending' && (
                      <button
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        className="btn btn-secondary btn-small"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default EventInvitationPage;
