import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFacultyEventById } from '../services/facultyEventService';
import { getFeedbacksForEvent } from '../services/feedbackService';
import { useToast } from '../contexts/ToastContext';
import { formatDateTime, formatDate } from '../utils/dateUtils';
import './FacultyEventDetailPage.css';

function FacultyEventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showError } = useToast();
  const [event, setEvent] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEventDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getFacultyEventById(id);
      setEvent(response.event);
      
      // Load feedbacks if event is completed
      if (response.event && response.event.status === 'completed') {
        try {
          const feedbackResponse = await getFeedbacksForEvent(id);
          setFeedbacks(feedbackResponse.feedbacks || []);
        } catch (err) {
          console.error('Error loading feedbacks:', err);
          // Don't show error for feedbacks, just log it
        }
      }
    } catch (err) {
      console.error('Error loading event details:', err);
      showError(err.response?.data?.error || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    document.title = 'Faculty Event Details - CESMS';
    loadEventDetails();
  }, [loadEventDetails]);

  const getStatusBadge = (status) => {
    const statusClasses = {
      upcoming: 'status-badge upcoming',
      ongoing: 'status-badge ongoing',
      completed: 'status-badge completed',
      cancelled: 'status-badge cancelled',
      pending: 'status-badge pending',
      approved: 'status-badge approved',
      rejected: 'status-badge rejected'
    };
    return <span className={statusClasses[status] || 'status-badge'}>{status}</span>;
  };

  if (loading) {
    return (
      <div className="faculty-event-detail-page">
        <div className="loading">Loading event details...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="faculty-event-detail-page">
        <div className="page-header">
          <div>
            <h1>Faculty Event Details</h1>
            <p>Review event information</p>
          </div>
          <button onClick={() => navigate('/faculty-events')} className="back-button">
            ← Back to Faculty Events
          </button>
        </div>
        <div className="error-message">Event not found</div>
      </div>
    );
  }

  // Group venue bookings by package_id - only approved ones
  const venueBookings = (event.venue_bookings || []).filter(b => b.status === 'approved');
  
  const venuePackages = {};
  const standaloneVenueBookings = [];
  
  venueBookings.forEach(booking => {
    if (booking.package_id) {
      if (!venuePackages[booking.package_id]) {
        venuePackages[booking.package_id] = [];
      }
      venuePackages[booking.package_id].push(booking);
    } else {
      standaloneVenueBookings.push(booking);
    }
  });
  

  const booking = event.venue_bookings?.[0]; // Keep for backward compatibility

  return (
    <div className="faculty-event-detail-page">
      <div className="page-header">
        <div>
          <h1>Faculty Event Details</h1>
          <p>Review event information</p>
        </div>
        <button onClick={() => navigate('/faculty-events')} className="back-button">
          ← Back to Faculty Events
        </button>
      </div>

      <div className="event-header">
        <h1>{event.event_name}</h1>
        <div className="header-badges">
          {getStatusBadge(event.status)}
          <span className="event-type">{event.event_type || 'General'}</span>
          <span className="event-visibility">{event.visibility}</span>
        </div>
      </div>

      {/* Event Information Section */}
      <div className="detail-section">
        <h2>📋 Event Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Organizer</label>
            <p>{event.organizer?.name || 'N/A'}</p>
            <small>{event.organizer?.email}</small>
          </div>
          <div className="info-item">
            <label>Faculty</label>
            <p>{event.organizer?.faculty?.name || 'N/A'}</p>
            <small>{event.organizer?.faculty?.code}</small>
          </div>
          <div className="info-item">
            <label>Start Date & Time</label>
            <p>{formatDateTime(event.start_datetime)}</p>
          </div>
          <div className="info-item">
            <label>End Date & Time</label>
            <p>{formatDateTime(event.end_datetime)}</p>
          </div>
          {venueBookings.length > 0 && venueBookings[0].setup_time && (
            <div className="info-item">
              <label>Setup Time</label>
              <p>{venueBookings[0].setup_time} minutes</p>
            </div>
          )}
          {venueBookings.length > 0 && venueBookings[0].teardown_time && (
            <div className="info-item">
              <label>Teardown Time</label>
              <p>{venueBookings[0].teardown_time} minutes</p>
            </div>
          )}
        </div>
        {event.description && (
          <div className="description">
            <label>Description</label>
            <p>{event.description}</p>
          </div>
        )}
      </div>

      {/* Venue Booking Section */}
      {venueBookings.length > 0 && (
        <div className="detail-section">
          <h2>🏛️ Venue Booking Details</h2>
          
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Venue</th>
                  <th>Code</th>
                  <th>Location</th>
                  <th>Capacity</th>
                </tr>
              </thead>
              <tbody>
                {venueBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td><strong>{booking.venue?.name || 'N/A'}</strong></td>
                    <td>{booking.venue?.code || 'N/A'}</td>
                    <td>{booking.venue?.location || 'N/A'}</td>
                    <td>{booking.venue?.capacity || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Old complex display - remove this entire section */}
      {false && venueBookings.length > 0 && (
        <div className="detail-section">
          <h2>🏛️ Venue Booking Details</h2>
          
          {/* Display packages */}
          {Object.values(venuePackages).map((packageBookings, pkgIndex) => {
            const firstBooking = packageBookings[0];
            const allSameStatus = packageBookings.every(b => b.status === firstBooking.status);
            
            return (
              <div key={`package-${pkgIndex}`} className="venue-package" style={{ 
                marginBottom: '20px', 
                padding: '15px', 
                border: '2px solid #667eea',
                borderRadius: '8px',
                backgroundColor: '#f8f9ff'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '15px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #667eea'
                }}>
                  <h3 style={{ margin: 0, color: '#667eea' }}>
                    📦 Venue Package ({packageBookings.length} venues)
                  </h3>
                  {allSameStatus && getStatusBadge(firstBooking.status)}
                </div>
                
                {packageBookings.map((booking, idx) => (
                  <div key={booking.id} style={{ 
                    marginBottom: idx < packageBookings.length - 1 ? '15px' : '0',
                    paddingBottom: idx < packageBookings.length - 1 ? '15px' : '0',
                    borderBottom: idx < packageBookings.length - 1 ? '1px dashed #ccc' : 'none'
                  }}>
                    <div className="booking-status-header">
                      <h4 style={{ margin: '0 0 10px 0' }}>{booking.venue?.name}</h4>
                      {!allSameStatus && getStatusBadge(booking.status)}
                    </div>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Venue Code</label>
                        <p>{booking.venue?.code}</p>
                      </div>
                      <div className="info-item">
                        <label>Location</label>
                        <p>{booking.venue?.location || 'N/A'}</p>
                      </div>
                      <div className="info-item">
                        <label>Capacity</label>
                        <p>{booking.venue?.capacity || 'N/A'}</p>
                      </div>
                      <div className="info-item">
                        <label>Expected Attendees</label>
                        <p>{booking.expected_attendees || 'N/A'}</p>
                      </div>
                      <div className="info-item">
                        <label>Requested Time</label>
                        <p>{formatDateTime(booking.requested_start_datetime)}</p>
                        <small>to</small>
                        <p>{formatDateTime(booking.requested_end_datetime)}</p>
                      </div>
                      {booking.approved_start_datetime && (
                        <div className="info-item">
                          <label>Approved Time</label>
                          <p>{formatDateTime(booking.approved_start_datetime)}</p>
                          <small>to</small>
                          <p>{formatDateTime(booking.approved_end_datetime)}</p>
                        </div>
                      )}
                      <div className="info-item">
                        <label>Setup Time</label>
                        <p>{booking.setup_time ? `${booking.setup_time} minutes` : 'N/A'}</p>
                      </div>
                      <div className="info-item">
                        <label>Teardown Time</label>
                        <p>{booking.teardown_time ? `${booking.teardown_time} minutes` : 'N/A'}</p>
                      </div>
                    </div>
                    {booking.remarks && (
                      <div className="remarks">
                        <label>Booking Remarks</label>
                        <p>{booking.remarks}</p>
                      </div>
                    )}
                    {booking.approval_notes && (
                      <div className="approval-notes">
                        <label>Approval Notes</label>
                        <p>{booking.approval_notes}</p>
                        {booking.approved_at && (
                          <small>Approved on {formatDate(booking.approved_at)}</small>
                        )}
                      </div>
                    )}
                    {booking.rejection_reason && (
                      <div className="rejection-reason">
                        <label>Rejection Reason</label>
                        <p>{booking.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          
          {/* Display standalone bookings */}
          {standaloneVenueBookings.map(booking => (
            <div key={booking.id} style={{ marginBottom: '20px' }}>
              <div className="booking-status-header">
                <h3>{booking.venue?.name}</h3>
                {getStatusBadge(booking.status)}
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <label>Venue Code</label>
                  <p>{booking.venue?.code}</p>
                </div>
                <div className="info-item">
                  <label>Location</label>
                  <p>{booking.venue?.location || 'N/A'}</p>
                </div>
                <div className="info-item">
                  <label>Capacity</label>
                  <p>{booking.venue?.capacity || 'N/A'}</p>
                </div>
                <div className="info-item">
                  <label>Expected Attendees</label>
                  <p>{booking.expected_attendees || 'N/A'}</p>
                </div>
                <div className="info-item">
                  <label>Requested Time</label>
                  <p>{formatDateTime(booking.requested_start_datetime)}</p>
                  <small>to</small>
                  <p>{formatDateTime(booking.requested_end_datetime)}</p>
                </div>
                {booking.approved_start_datetime && (
                  <div className="info-item">
                    <label>Approved Time</label>
                    <p>{formatDateTime(booking.approved_start_datetime)}</p>
                    <small>to</small>
                    <p>{formatDateTime(booking.approved_end_datetime)}</p>
                  </div>
                )}
                <div className="info-item">
                  <label>Setup Time</label>
                  <p>{booking.setup_time ? `${booking.setup_time} minutes` : 'N/A'}</p>
                </div>
                <div className="info-item">
                  <label>Teardown Time</label>
                  <p>{booking.teardown_time ? `${booking.teardown_time} minutes` : 'N/A'}</p>
                </div>
              </div>
              {booking.remarks && (
                <div className="remarks">
                  <label>Booking Remarks</label>
                  <p>{booking.remarks}</p>
                </div>
              )}
              {booking.approval_notes && (
                <div className="approval-notes">
                  <label>Approval Notes</label>
                  <p>{booking.approval_notes}</p>
                  {booking.approved_at && (
                    <small>Approved on {formatDate(booking.approved_at)}</small>
                  )}
                </div>
              )}
              {booking.rejection_reason && (
                <div className="rejection-reason">
                  <label>Rejection Reason</label>
                  <p>{booking.rejection_reason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Old single booking display - remove this entire section */}
      {false && booking && (
        <div className="detail-section">
          <h2>🏛️ Venue Booking Details</h2>
          <div className="booking-status-header">
            <h3>{booking.venue?.name}</h3>
            {getStatusBadge(booking.status)}
          </div>
          <div className="info-grid">
            <div className="info-item">
              <label>Venue Code</label>
              <p>{booking.venue?.code}</p>
            </div>
            <div className="info-item">
              <label>Location</label>
              <p>{booking.venue?.location || 'N/A'}</p>
            </div>
            <div className="info-item">
              <label>Capacity</label>
              <p>{booking.venue?.capacity || 'N/A'}</p>
            </div>
            <div className="info-item">
              <label>Expected Attendees</label>
              <p>{booking.expected_attendees || 'N/A'}</p>
            </div>
            <div className="info-item">
              <label>Requested Time</label>
              <p>{formatDateTime(booking.requested_start_datetime)}</p>
              <small>to</small>
              <p>{formatDateTime(booking.requested_end_datetime)}</p>
            </div>
            {booking.approved_start_datetime && (
              <div className="info-item">
                <label>Approved Time</label>
                <p>{formatDateTime(booking.approved_start_datetime)}</p>
                <small>to</small>
                <p>{formatDateTime(booking.approved_end_datetime)}</p>
              </div>
            )}
            <div className="info-item">
              <label>Setup Time</label>
              <p>{booking.setup_time ? `${booking.setup_time} minutes` : 'N/A'}</p>
            </div>
            <div className="info-item">
              <label>Teardown Time</label>
              <p>{booking.teardown_time ? `${booking.teardown_time} minutes` : 'N/A'}</p>
            </div>
          </div>
          {booking.remarks && (
            <div className="remarks">
              <label>Booking Remarks</label>
              <p>{booking.remarks}</p>
            </div>
          )}
          {booking.approval_notes && (
            <div className="approval-notes">
              <label>Approval Notes</label>
              <p>{booking.approval_notes}</p>
              {booking.approved_at && (
                <small>Approved on {formatDate(booking.approved_at)}</small>
              )}
            </div>
          )}
          {booking.rejection_reason && (
            <div className="rejection-reason">
              <label>Rejection Reason</label>
              <p>{booking.rejection_reason}</p>
            </div>
          )}
        </div>
      )}

      {/* Resource Requests Section */}
      <div className="detail-section">
        <h2>📦 Resource Requests</h2>
        {event.resource_requests && event.resource_requests.filter(r => r.status === 'approved').length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Category</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {event.resource_requests.filter(r => r.status === 'approved').map(request => (
                  <tr key={request.id}>
                    <td><strong>{request.resource?.name}</strong></td>
                    <td>{request.resource?.category?.name || 'N/A'}</td>
                    <td>
                      {request.requested_quantity} {request.resource?.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No approved resource requests for this event.</p>
        )}
      </div>

      {/* Participants Section */}
      <div className="detail-section">
        <h2>👥 Participants ({event.participant_count || 0})</h2>
        {event.participants && event.participants.length > 0 ? (
          <div className="table-container">
            <table className="participants-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {event.participants.map(participant => (
                  <tr key={participant.id}>
                    <td>{participant.user?.name}</td>
                    <td>{participant.user?.email}</td>
                    <td>{participant.user?.role?.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</td>
                    <td>{participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}</td>
                    <td>{formatDate(participant.registered_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">No participants registered yet.</p>
        )}
      </div>

      {/* Feedback Section - Only for completed events */}
      {event.status === 'completed' && (
        <div className="detail-section feedback-section">
          <h2>📝 Event Feedback ({feedbacks.length})</h2>
          {feedbacks.length > 0 ? (
            <div className="feedbacks-list">
              {feedbacks.map((feedback, index) => (
                <div key={feedback.id} className="feedback-card">
                  <div className="feedback-header">
                    <div>
                      <h4>{feedback.user?.name}</h4>
                      <small className="feedback-date">{formatDate(feedback.created_at)}</small>
                    </div>
                    {feedback.overall_rating > 0 && (
                      <div className="overall-rating">
                        <span className="rating-label">Overall:</span>
                        <div className="stars-display">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} className={`star ${star <= feedback.overall_rating ? 'filled' : ''}`}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="feedback-ratings">
                    {feedback.venue_condition_rating > 0 && (
                      <div className="rating-item">
                        <span className="rating-label">Venue Condition:</span>
                        <div className="stars-display">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} className={`star ${star <= feedback.venue_condition_rating ? 'filled' : ''}`}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {feedback.event_organization_rating > 0 && (
                      <div className="rating-item">
                        <span className="rating-label">Event Organization:</span>
                        <div className="stars-display">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} className={`star ${star <= feedback.event_organization_rating ? 'filled' : ''}`}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {feedback.cleanliness_rating > 0 && (
                      <div className="rating-item">
                        <span className="rating-label">Cleanliness:</span>
                        <div className="stars-display">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} className={`star ${star <= feedback.cleanliness_rating ? 'filled' : ''}`}>
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="feedback-content">
                    <div className="feedback-comments">
                      <strong>Comments:</strong>
                      <p>{feedback.comments}</p>
                    </div>
                    {feedback.suggestions && (
                      <div className="feedback-suggestions">
                        <strong>Suggestions:</strong>
                        <p>{feedback.suggestions}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No feedback received yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default FacultyEventDetailPage;
