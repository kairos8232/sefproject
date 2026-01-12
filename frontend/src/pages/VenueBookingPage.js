import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import venueBookingService from '../services/venueBookingService';
import facultyService from '../services/facultyService';
import { toDateTimeLocalInput, fromDateTimeLocalInput, formatDateTime } from '../utils/dateUtils';
import { useToast } from '../contexts/ToastContext';
import './VenueBookingPage.css';

function VenueBookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const event = location.state?.event;
  const { showSuccess } = useToast();

  const [formData, setFormData] = useState({
    requested_start_datetime: event ? toDateTimeLocalInput(event.start_datetime) : '',
    requested_end_datetime: event ? toDateTimeLocalInput(event.end_datetime) : '',
    expected_attendees: '',
    setup_time: 0,
    teardown_time: 0,
    faculty_filter: '',
    remarks: ''
  });

  const [availableVenues, setAvailableVenues] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [selectedVenues, setSelectedVenues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Redirect if no event provided
  useEffect(() => {
    document.title = 'Book Venue - CESMS';
    
    if (!event) {
      navigate('/my-events');
    }

    // Load faculties using public endpoint
    const loadFaculties = async () => {
      try {
        const data = await facultyService.getPublicFaculties();
        setFaculties(data.faculties || []);
      } catch (err) {
        console.error('Error loading faculties:', err);
        // Don't show error to user - faculty filter is optional
      }
    };

    loadFaculties();
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
    setSelectedVenues([]);
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
      // Calculate actual start and end time including setup and teardown
      const setupMinutes = formData.setup_time ? parseInt(formData.setup_time) : 0;
      const teardownMinutes = formData.teardown_time ? parseInt(formData.teardown_time) : 0;
      
      const actualStartTime = new Date(startTime.getTime() - setupMinutes * 60 * 1000);
      const actualEndTime = new Date(endTime.getTime() + teardownMinutes * 60 * 1000);
      
      console.log('[VenueBooking] Checking availability with faculty filter:', formData.faculty_filter || 'none');
      
      const result = await venueBookingService.checkAvailability(
        actualStartTime.toISOString(),
        actualEndTime.toISOString(),
        event?.expected_attendees || null,
        formData.faculty_filter || null
      );
      
      console.log('[VenueBooking] Available venues:', result.venues?.length || 0);

      setAvailableVenues(result.venues);
      setSearchPerformed(true);
    } catch (err) {
      console.error('Search venues error:', err);
      setError(err.response?.data?.error || 'Failed to search venues');
    } finally {
      setLoading(false);
    }
  };

  const handleVenueToggle = (venue) => {
    setSelectedVenues(prev => {
      const isSelected = prev.some(v => v.id === venue.id);
      if (isSelected) {
        return prev.filter(v => v.id !== venue.id);
      } else {
        return [...prev, venue];
      }
    });
  };

  const handleSubmitBooking = async () => {
    if (selectedVenues.length === 0) {
      setError('Please select at least one venue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create package with multiple venues
      const packageData = {
        event_id: event.id,
        venue_ids: selectedVenues.map(v => v.id),
        requested_start_datetime: fromDateTimeLocalInput(formData.requested_start_datetime),
        requested_end_datetime: fromDateTimeLocalInput(formData.requested_end_datetime),
        expected_attendees: event?.expected_attendees || null,
        setup_time: formData.setup_time ? parseInt(formData.setup_time) : 0,
        teardown_time: formData.teardown_time ? parseInt(formData.teardown_time) : 0,
        remarks: formData.remarks || null
      };

      await venueBookingService.createPackage(packageData);
      
      // Success - show toast and navigate to my events page
      showSuccess('Venue package submitted successfully!');
      navigate('/my-events');
    } catch (err) {
      console.error('Submit booking error:', err);
      setError(err.response?.data?.error || 'Failed to submit venue booking package');
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

          {/* Faculty Filter */}
          <div className="venue-filter-group">
            <label htmlFor="faculty_filter">Filter by Faculty (Optional)</label>
            <select
              id="faculty_filter"
              name="faculty_filter"
              value={formData.faculty_filter}
              onChange={handleInputChange}
            >
              <option value="">All Faculties</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </select>
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
              {availableVenues.map((venue) => {
                const isSelected = selectedVenues.some(v => v.id === venue.id);
                return (
                  <div
                    key={venue.id}
                    className={`venue-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleVenueToggle(venue)}
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
                    {isSelected && (
                      <div className="selected-badge">✓ Selected</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Booking Form Section */}
        {selectedVenues.length > 0 && (
          <div className="booking-form-section">
            <h2>Booking Details</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmitBooking(); }}>
              <div className="form-group">
                <label>Selected Venues ({selectedVenues.length})</label>
                <div className="selected-venues-list">
                  {selectedVenues.map((venue, index) => (
                    <div key={venue.id} className="selected-venue-item">
                      <span className="venue-number">{index + 1}.</span>
                      <span className="venue-info">
                        {venue.name} ({venue.code}) - {venue.faculty?.name || 'N/A'}
                      </span>
                      <button
                        type="button"
                        className="remove-venue-btn"
                        onClick={() => handleVenueToggle(venue)}
                        title="Remove from selection"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
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
