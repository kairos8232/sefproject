import React, { useState, useEffect } from 'react';
import invitationService from '../services/invitationService';
import venueBookingService from '../services/venueBookingService';
import { useToast } from '../contexts/ToastContext';
import './InvitationsReceivedModal.css';

const InvitationsReceivedModal = ({ isOpen, onClose }) => {
  const { showSuccess, showError: showToastError } = useToast();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [respondingTo, setRespondingTo] = useState(null);
  const [eventBookings, setEventBookings] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchInvitations();
    }
  }, [isOpen]);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await invitationService.getUserInvitations();
      // Filter to only pending invitations
      const pendingInvitations = data.filter((inv) => inv.status === 'pending');
      setInvitations(pendingInvitations);

      // Fetch venue bookings for each event
      const bookingsMap = {};
      for (const invitation of pendingInvitations) {
        if (invitation.event?.id) {
          try {
            const bookings = await venueBookingService.getBookingsByEvent(invitation.event.id);
            const bookingList = bookings.bookings || bookings || [];
            const approved = bookingList.find((b) => b.status === 'approved') || null;
            bookingsMap[invitation.event.id] = approved;
          } catch (err) {
            console.error(`Failed to fetch bookings for event ${invitation.event.id}:`, err);
            bookingsMap[invitation.event.id] = null;
          }
        }
      }
      setEventBookings(bookingsMap);
    } catch (err) {
      setError(err.message || 'Failed to load invitations');
      console.error('Error fetching invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (invitationId, status) => {
    try {
      setError('');
      setRespondingTo(invitationId);

      const invitation = invitations.find(inv => inv.id === invitationId);
      await invitationService.respondToInvitation(invitationId, status);

      // Remove from list after responding
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      setRespondingTo(null);

      // Show toast notification
      if (status === 'accepted') {
        showSuccess('Invitation accepted successfully');
        // Redirect to registration form page
        if (invitation?.event?.id) {
          setTimeout(() => {
            window.location.href = `/events/${invitation.event.id}/register`;
          }, 500);
        }
      } else if (status === 'declined') {
        showSuccess('Invitation declined');
      }
    } catch (err) {
      setError(err.message || 'Failed to respond to invitation');
      console.error('Error responding to invitation:', err);
      showToastError(err.message || 'Failed to respond to invitation');
      setRespondingTo(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content invitations-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Event Invitations</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-message">Loading invitations...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : invitations.length === 0 ? (
            <div className="empty-message">No pending invitations</div>
          ) : (
            <div className="invitations-list">
              {invitations.map((invitation) => {
                const event = invitation.event;
                const booking = eventBookings[event?.id];
                const startTime = new Date(event?.start_datetime);
                const endTime = new Date(event?.end_datetime);
                const dateStr = startTime.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                const startTimeStr = startTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });
                const endTimeStr = endTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });

                return (
                  <div key={invitation.id} className="invitation-card">
                    <div className="invitation-info">
                      <h3>{event?.event_name || event?.title || 'Event'}</h3>
                      <p className="event-datetime">
                        {dateStr} {startTimeStr} - {endTimeStr}
                      </p>
                      <p className="organizer-info">
                        Organized by: {event?.organizer?.name || 'Unknown'}
                      </p>

                      {/* Display venue from approved booking */}
                      {booking?.venue?.name && (
                        <p className="schedule-detail" style={{ marginTop: '8px' }}>
                          <strong>Venue:</strong> {booking.venue.name}
                        </p>
                      )}
                    </div>

                    <div className="invitation-actions">
                      <button
                        onClick={() => handleRespond(invitation.id, 'accepted')}
                        disabled={respondingTo === invitation.id}
                        className="btn btn-accept"
                        title="Accept this invitation"
                      >
                        <span className="checkmark">✓</span>
                        {respondingTo === invitation.id ? 'Processing...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleRespond(invitation.id, 'declined')}
                        disabled={respondingTo === invitation.id}
                        className="btn btn-decline"
                        title="Decline this invitation"
                      >
                        <span className="cross">✕</span>
                        {respondingTo === invitation.id ? 'Processing...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitationsReceivedModal;
