import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFacultyEventById } from '../services/facultyEventService';
import { createFeedback, updateFeedback, getUserFeedbackForEvent } from '../services/feedbackService';
import { useToast } from '../contexts/ToastContext';
import './FacultyProvideFeedbackPage.css';

const FacultyProvideFeedbackPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [event, setEvent] = useState(null);
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [feedbackForm, setFeedbackForm] = useState({
    venue_condition_rating: 0,
    event_organization_rating: 0,
    cleanliness_rating: 0,
    overall_rating: 0,
    comments: '',
    suggestions: ''
  });

  const loadEventAndFeedback = useCallback(async () => {
    document.title = 'Provide Feedback - CESMS';
    
    // Validate eventId format
    if (!eventId) {
      showError('Event ID is missing');
      setLoading(false);
      return;
    }
    
    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      showError(`Invalid event ID format: ${eventId}`);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Load event details
      const response = await getFacultyEventById(eventId);
      const eventData = response.event || response; // Handle both response formats
      setEvent(eventData);
      
      // Check if user already provided feedback
      const feedbackResponse = await getUserFeedbackForEvent(eventId);
      
      if (feedbackResponse.has_feedback) {
        // Attach can_edit from response to feedback object
        const feedbackWithEditFlag = {
          ...feedbackResponse.feedback,
          can_edit: feedbackResponse.can_edit
        };
        setExistingFeedback(feedbackWithEditFlag);
        setFeedbackForm({
          venue_condition_rating: feedbackResponse.feedback.venue_condition_rating || 0,
          event_organization_rating: feedbackResponse.feedback.event_organization_rating || 0,
          cleanliness_rating: feedbackResponse.feedback.cleanliness_rating || 0,
          overall_rating: feedbackResponse.feedback.overall_rating || 0,
          comments: feedbackResponse.feedback.comments || '',
          suggestions: feedbackResponse.feedback.suggestions || ''
        });
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading event:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load event information';
      showError(errorMessage);
      setLoading(false);
    }
  }, [eventId, showError]);

  useEffect(() => {
    loadEventAndFeedback();
  }, [loadEventAndFeedback]);

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!feedbackForm.venue_condition_rating || !feedbackForm.event_organization_rating || 
        !feedbackForm.cleanliness_rating || !feedbackForm.overall_rating) {
      showError('Please provide all ratings (1-5 stars)');
      return;
    }
    
    if (!feedbackForm.comments || feedbackForm.comments.trim() === '') {
      showError('Please provide comments');
      return;
    }
    
    try {
      const feedbackData = {
        event_id: eventId,
        ...feedbackForm
      };
      
      if (existingFeedback) {
        // Update existing feedback
        await updateFeedback(existingFeedback.id, feedbackData);
        showSuccess('Feedback updated successfully!');
      } else {
        // Create new feedback
        await createFeedback(feedbackData);
        showSuccess('Feedback submitted successfully!');
      }
      
      // Redirect back to faculty events page after 1 second
      setTimeout(() => {
        navigate('/faculty-events');
      }, 1000);
      
    } catch (err) {
      console.error('Error submitting feedback:', err);
      showError(err.response?.data?.error || 'Failed to submit feedback');
    }
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return 'N/A';
    try {
      return new Date(datetime).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Invalid Date';
    }
  };

  const getOrganizerName = () => {
    if (!event) return 'N/A';
    return event.organizer?.name || event.organizer_name || 'N/A';
  };

  const getVenueName = () => {
    if (!event) return 'N/A';
    if (event.venue_name) return event.venue_name;
    if (event.venue_bookings && event.venue_bookings.length > 0) {
      const approvedBooking = event.venue_bookings.find(b => b.status === 'approved');
      if (approvedBooking?.venue?.name) return approvedBooking.venue.name;
      if (event.venue_bookings[0]?.venue?.name) return event.venue_bookings[0].venue.name;
    }
    return 'N/A';
  };

  // Rating star component
  const StarRating = ({ rating, onChange, label }) => {
    return (
      <div className="rating-field">
        <label>{label} <span className="required">*</span></label>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`star ${star <= rating ? 'filled' : ''}`}
              onClick={() => onChange(star)}
            >
              ★
            </span>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="faculty-events-page">
        <div className="loading">Loading event information...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="faculty-events-page">
        <div className="error-message">Event not found</div>
        <button onClick={() => navigate('/faculty-events')} className="back-button">
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="faculty-events-page">
      <div className="page-header">
        <div>
          <h1>📝 {existingFeedback ? 'Edit Feedback' : 'Provide Feedback'}</h1>
          <p>Share your feedback about this event</p>
        </div>
        <button onClick={() => navigate('/faculty-events')} className="back-button">
          Back to Events
        </button>
      </div>

      <div className="feedback-container">

        {/* Event Information Card */}
        <div className="event-info-section">
          <h2>📅 {event.event_name || 'Event Details'}</h2>
          <div className="event-details">
            <div className="detail-row">
              <span className="label">Organizer:</span>
              <span className="value">{getOrganizerName()}</span>
            </div>
            <div className="detail-row">
              <span className="label">Date:</span>
              <span className="value">
                {formatDateTime(event.start_datetime)} - {formatDateTime(event.end_datetime)}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Venue:</span>
              <span className="value">{getVenueName()}</span>
            </div>
            <div className="detail-row">
              <span className="label">Status:</span>
              <span className="value">
                <span className={`status-badge ${event.status}`}>{event.status || 'N/A'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Submission Info */}
        {existingFeedback && (
          <div className="feedback-info">
            <p>
              <strong>📝 Feedback submitted:</strong> {formatDateTime(existingFeedback.created_at)}
            </p>
            {existingFeedback.updated_at && existingFeedback.updated_at !== existingFeedback.created_at && (
              <p>
                <strong>✏️ Last edited:</strong> {formatDateTime(existingFeedback.updated_at)}
              </p>
            )}
            {existingFeedback.can_edit ? (
              <p className="edit-notice success">✅ You can edit this feedback (within 24 hours)</p>
            ) : (
              <p className="edit-notice warning">⚠️ Editing period expired (24 hours limit)</p>
            )}
          </div>
        )}

        {/* Feedback Form */}
        <form onSubmit={handleSubmitFeedback} className="feedback-form">
          <div className="form-section">
            <h3>Event Ratings</h3>
            <p className="section-description">Please rate the following aspects on a scale of 1-5 stars</p>
            
            <div className="ratings-grid">
              <StarRating
                label="Venue Condition"
                rating={feedbackForm.venue_condition_rating}
                onChange={(rating) => setFeedbackForm({...feedbackForm, venue_condition_rating: rating})}
              />
              
              <StarRating
                label="Event Organization"
                rating={feedbackForm.event_organization_rating}
                onChange={(rating) => setFeedbackForm({...feedbackForm, event_organization_rating: rating})}
              />
              
              <StarRating
                label="Cleanliness"
                rating={feedbackForm.cleanliness_rating}
                onChange={(rating) => setFeedbackForm({...feedbackForm, cleanliness_rating: rating})}
              />
              
              <StarRating
                label="Overall Experience"
                rating={feedbackForm.overall_rating}
                onChange={(rating) => setFeedbackForm({...feedbackForm, overall_rating: rating})}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Comments & Suggestions</h3>
            
            <div className="form-group">
              <label>Comments <span className="required">*</span></label>
              <textarea
                value={feedbackForm.comments}
                onChange={(e) => setFeedbackForm({...feedbackForm, comments: e.target.value})}
                placeholder="Please provide your detailed feedback about the event..."
                rows="5"
                required
              />
            </div>

            <div className="form-group">
              <label>Suggestions for Improvement</label>
              <textarea
                value={feedbackForm.suggestions}
                onChange={(e) => setFeedbackForm({...feedbackForm, suggestions: e.target.value})}
                placeholder="Any suggestions for future events... (optional)"
                rows="4"
              />
            </div>
          </div>

          {existingFeedback && !existingFeedback.can_edit && (
            <div className="info-message">
              Note: This feedback was submitted more than 24 hours ago and cannot be edited.
            </div>
          )}

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel" 
              onClick={() => navigate('/faculty-events')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-submit"
              disabled={existingFeedback && !existingFeedback.can_edit}
            >
              {existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FacultyProvideFeedbackPage;
