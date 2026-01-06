import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import venueBookingService from '../services/venueBookingService';
import { toDateTimeLocalInput, fromDateTimeLocalInput, formatDateTime } from '../utils/dateUtils';
import './VenueBookingPage.css';

function VenueBookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const event = location.state?.event;

  const [formData, setFormData] = useState({
    requested_start_datetime: event ? toDateTimeLocalInput(event.start_datetime) : '',
    requested_end_datetime: event ? toDateTimeLocalInput(event.end_datetime) : '',
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
        fromDateTimeLocalInput(formData.requested_start_datetime),
        fromDateTimeLocalInput(formData.requested_end_datetime),
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
        requested_start_datetime: fromDateTimeLocalInput(formData.requested_start_datetime),
        requested_end_datetime: fromDateTimeLocalInput(formData.requested_end_datetime),
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



  return (
    <div className="venue-booking-page">
      <div className="venue-booking-header">
        <div>
          <h1>Book Venue</h1>
          <p>Select a venue for your event</p>
          <div className="event-info">
            <strong>Event:</strong> {event.event_name}
          </div>
          <div className="event-info">
            <strong>Time:</strong> {formatDateTime(event.start_datetime)} - {formatDateTime(event.end_datetime)}
          </div>
        </div>
        <button onClick={() => navigate('/my-events')} className="back-button">
          Back to My Events
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="venue-booking-container">
        {/* Venue Selection Section */}
        <div className="venue-selection-section">
          <h2>Available Venues</h2>

          {/* Filters */}
          <div className="filter-section">
            <div className="form-group">
              <label htmlFor="expected_attendees">Expected Attendees (Optional)</label>
              <input
                type="number"
                id="expected_attendees"
                name="expected_attendees"
                value={formData.expected_attendees}
                onChange={handleInputChange}
                min="1"
                placeholder="e.g., 100"
              />
              <small>Filter venues by minimum capacity</small>
            </div>
          </div>

          <button onClick={handleSearchVenues} className="search-button" disabled={loading}>
            {loading ? 'Loading Venues...' : 'Search Venues'}
          </button>

          {loading ? (
            <div className="loading">Loading venues...</div>
          ) : searchPerformed && availableVenues.length === 0 ? (
            <div className="no-venues">
              <p>No venues are available for the selected date and time.</p>
              <p>Please try different dates or contact the administrator.</p>
            </div>
          ) : searchPerformed ? (
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
                    <div className="selected-badge">Selected</div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Booking Form Section */}
        {selectedVenue && (
          <div className="booking-form-section">
            <h2>Booking Details</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmitBooking(); }}>
              <div className="form-group">
                <label>Selected Venue</label>
                <input
                  type="text"
                  value={`${selectedVenue.name} (${selectedVenue.code})`}
                  readOnly
                  className="readonly-field"
                />
              </div>

              <div className="form-group">
                <label>Start Date & Time</label>
                <input
                  type="text"
                  value={formatDateTime(event.start_datetime)}
                  readOnly
                  className="readonly-field"
                />
                <small>Locked to event start time</small>
              </div>

              <div className="form-group">
                <label>End Date & Time</label>
                <input
                  type="text"
                  value={formatDateTime(event.end_datetime)}
                  readOnly
                  className="readonly-field"
                />
                <small>Locked to event end time</small>
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

              <div className="form-group">
                <label htmlFor="remarks">Additional Notes / Special Requests</label>
                <textarea
                  id="remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="e.g., Need projector, microphone setup, etc."
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => navigate('/my-events')}
                  className="cancel-button"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Booking Request'}
                </button>
              </div>

              <p className="submit-note">
                Note: Your booking request will be submitted with status "Pending" and will require approval from faculty managers.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default VenueBookingPage;
