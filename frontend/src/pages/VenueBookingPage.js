import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import venueBookingService from '../services/venueBookingService';
import './VenueBookingPage.css';

function VenueBookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const event = location.state?.event;

  // Convert event datetime to input format (YYYY-MM-DDTHH:mm)
  const formatDatetimeForInput = (datetime) => {
    if (!datetime) return '';
    const date = new Date(datetime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    requested_start_datetime: event ? formatDatetimeForInput(event.start_datetime) : '',
    requested_end_datetime: event ? formatDatetimeForInput(event.end_datetime) : '',
    expected_attendees: '',
    setup_time: 0,
    teardown_time: 0,
    remarks: ''
  });

  const [availableVenues, setAvailableVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Redirect if no event provided
  useEffect(() => {
    if (!event) {
      navigate('/my-events');
    }
  }, [event, navigate]);

  if (!event) {
    return null;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearchVenues = async (e) => {
    e.preventDefault();
    setError('');
    setAvailableVenues([]);
    setSelectedVenue(null);
    setSearchPerformed(false);

    // Validation
    if (!formData.requested_start_datetime || !formData.requested_end_datetime) {
      setError('Please provide both start and end datetime');
      return;
    }

    const startTime = new Date(formData.requested_start_datetime);
    const endTime = new Date(formData.requested_end_datetime);

    if (endTime <= startTime) {
      setError('End datetime must be after start datetime');
      return;
    }

    setLoading(true);

    try {
      const result = await venueBookingService.checkAvailability(
        formData.requested_start_datetime,
        formData.requested_end_datetime,
        formData.expected_attendees || null,
        null // faculty_id - could be added as filter later
      );

      setAvailableVenues(result.venues);
      setSearchPerformed(true);
    } catch (err) {
      console.error('Search venues error:', err);
      setError(err.response?.data?.error || 'Failed to search venues');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBooking = async () => {
    if (!selectedVenue) {
      setError('Please select a venue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const bookingData = {
        event_id: event.id,
        venue_id: selectedVenue.id,
        requested_start_datetime: formData.requested_start_datetime,
        requested_end_datetime: formData.requested_end_datetime,
        expected_attendees: formData.expected_attendees ? parseInt(formData.expected_attendees) : null,
        setup_time: formData.setup_time ? parseInt(formData.setup_time) : 0,
        teardown_time: formData.teardown_time ? parseInt(formData.teardown_time) : 0,
        remarks: formData.remarks || null
      };

      const result = await venueBookingService.createBooking(bookingData);
      
      // Success - navigate to booking details page
      navigate(`/venue-bookings/${result.booking.id}`);
    } catch (err) {
      console.error('Submit booking error:', err);
      setError(err.response?.data?.error || 'Failed to submit venue booking');
      setLoading(false);
    }
  };

  const formatDateTime = (datetime) => {
    if (!datetime) return '';
    return new Date(datetime).toLocaleString();
  };

  return (
    <div className="venue-booking-page">
      <div className="venue-booking-header">
        <button onClick={() => navigate('/my-events')} className="back-button">
          ← Back to My Events
        </button>
        <h1>Book Venue</h1>
        <p className="event-info">For event: <strong>{event.event_name}</strong></p>
      </div>

      <div className="venue-booking-container">
        {error && <div className="error-message">{error}</div>}

        {/* Step 1: Booking Details */}
        <div className="booking-form-section">
          <h2>Step 1: Enter Booking Requirements</h2>
          <form onSubmit={handleSearchVenues}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="requested_start_datetime">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  id="requested_start_datetime"
                  name="requested_start_datetime"
                  value={formData.requested_start_datetime}
                  onChange={handleInputChange}
                  required
                  readOnly
                  className="readonly-field"
                />
                <small>Automatically set from event start time (cannot be changed)</small>
              </div>

              <div className="form-group">
                <label htmlFor="requested_end_datetime">End Date & Time *</label>
                <input
                  type="datetime-local"
                  id="requested_end_datetime"
                  name="requested_end_datetime"
                  value={formData.requested_end_datetime}
                  onChange={handleInputChange}
                  required
                  readOnly
                  className="readonly-field"
                />
                <small>Automatically set from event end time (cannot be changed)</small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="expected_attendees">Expected Attendees</label>
                <input
                  type="number"
                  id="expected_attendees"
                  name="expected_attendees"
                  value={formData.expected_attendees}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="e.g., 100"
                />
                <small>Venues with insufficient capacity will be filtered out</small>
              </div>

              <div className="form-group">
                <label htmlFor="setup_time">Setup Time (minutes)</label>
                <input
                  type="number"
                  id="setup_time"
                  name="setup_time"
                  value={formData.setup_time}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="e.g., 30"
                />
              </div>

              <div className="form-group">
                <label htmlFor="teardown_time">Teardown Time (minutes)</label>
                <input
                  type="number"
                  id="teardown_time"
                  name="teardown_time"
                  value={formData.teardown_time}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="e.g., 30"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="remarks">Additional Notes / Special Requests</label>
              <textarea
                id="remarks"
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                rows="3"
                placeholder="e.g., Need projector, microphone setup, etc."
              />
            </div>

            <button type="submit" className="search-button" disabled={loading}>
              {loading ? 'Searching...' : 'Search Available Venues'}
            </button>
          </form>
        </div>

        {/* Step 2: Select Venue */}
        {searchPerformed && (
          <div className="venue-selection-section">
            <h2>Step 2: Select a Venue</h2>
            
            {availableVenues.length === 0 ? (
              <div className="no-venues-message">
                <p>No venues are available for the selected date and time.</p>
                <p>Please try different dates or contact the administrator.</p>
              </div>
            ) : (
              <>
                <p className="venues-count">
                  Found {availableVenues.length} available venue{availableVenues.length !== 1 ? 's' : ''}
                </p>
                <div className="venues-grid">
                  {availableVenues.map((venue) => (
                    <div
                      key={venue.id}
                      className={`venue-card ${selectedVenue?.id === venue.id ? 'selected' : ''}`}
                      onClick={() => setSelectedVenue(venue)}
                    >
                      <div className="venue-header">
                        <h3>{venue.name}</h3>
                        <span className="venue-code">{venue.code}</span>
                      </div>
                      <div className="venue-details">
                        <p><strong>Faculty:</strong> {venue.faculty?.name || 'N/A'}</p>
                        <p><strong>Location:</strong> {venue.location || 'N/A'}</p>
                        <p><strong>Capacity:</strong> {venue.capacity || 'N/A'} people</p>
                      </div>
                      {selectedVenue?.id === venue.id && (
                        <div className="selected-badge">✓ Selected</div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Review and Submit */}
        {selectedVenue && (
          <div className="booking-summary-section">
            <h2>Step 3: Review and Submit</h2>
            <div className="booking-summary">
              <div className="summary-item">
                <span className="summary-label">Event:</span>
                <span className="summary-value">{event.event_name}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Venue:</span>
                <span className="summary-value">{selectedVenue.name} ({selectedVenue.code})</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Date & Time:</span>
                <span className="summary-value">
                  {formatDateTime(formData.requested_start_datetime)} - {formatDateTime(formData.requested_end_datetime)}
                </span>
              </div>
              {formData.expected_attendees && (
                <div className="summary-item">
                  <span className="summary-label">Expected Attendees:</span>
                  <span className="summary-value">{formData.expected_attendees}</span>
                </div>
              )}
              {formData.remarks && (
                <div className="summary-item">
                  <span className="summary-label">Notes:</span>
                  <span className="summary-value">{formData.remarks}</span>
                </div>
              )}
            </div>

            <div className="submit-actions">
              <button 
                onClick={handleSubmitBooking} 
                className="submit-button" 
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Booking Request'}
              </button>
              <p className="submit-note">
                Your booking will be submitted with status "Pending" and will require approval.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VenueBookingPage;
