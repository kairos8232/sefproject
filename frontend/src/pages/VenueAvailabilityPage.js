import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBlockedSlots, createBlock, updateBlock, deleteBlock } from '../services/venueAvailabilityService';
import { toDateTimeLocalInput, fromDateTimeLocalInput, formatDateTime } from '../utils/dateUtils';
import axios from 'axios';
import './VenueAvailabilityPage.css';

function VenueAvailabilityPage() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showBlocksList, setShowBlocksList] = useState(true);
  
  // Form states
  const [formData, setFormData] = useState({
    blocked_start_datetime: '',
    blocked_end_datetime: '',
    reason: ''
  });

  const loadVenues = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/venues', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setVenues(response.data.venues);
      }
    } catch (err) {
      console.error('Error loading venues:', err);
    }
  };

  const loadBlocks = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getBlockedSlots();
      setBlocks(response.blocks || []);
    } catch (err) {
      console.error('Error loading blocks:', err);
      setError(err.response?.data?.error || 'Failed to load blocked time slots');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/venue-bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        const allBookings = response.data.bookings || [];
        const approvedBookings = allBookings.filter(
          booking => booking.status === 'approved' || booking.booking_status === 'approved'
        );
        setBookings(approvedBookings);
      }
    } catch (err) {
      console.error('Error loading bookings:', err);
      // If endpoint doesn't exist, try alternative endpoint
      try {
        const token = localStorage.getItem('token');
        const altResponse = await axios.get('http://localhost:5001/api/faculty-events/bookings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (altResponse.data.success) {
          const approvedBookings = altResponse.data.bookings.filter(
            booking => booking.status === 'approved' || booking.booking_status === 'approved'
          );
          setBookings(approvedBookings);
        }
      } catch (altErr) {
        console.error('Error loading bookings from alternative endpoint:', altErr);
      }
    }
  }, []);

  useEffect(() => {
    document.title = 'Venue Availability - CESMS';
    loadVenues();
    loadBlocks();
    loadBookings();
  }, [loadBlocks, loadBookings]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVenue) {
      setError('Please select a venue first');
      return;
    }
    
    setError('');
    setSuccess('');

    try {
      const blockData = {
        venue_id: selectedVenue.id,
        blocked_start_datetime: fromDateTimeLocalInput(formData.blocked_start_datetime),
        blocked_end_datetime: fromDateTimeLocalInput(formData.blocked_end_datetime),
        reason: formData.reason
      };

      if (editingBlock) {
        await updateBlock(editingBlock.id, blockData);
        setSuccess('Time slot updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        await createBlock(blockData);
        setSuccess('Time slot blocked successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
      
      // Reset form
      setFormData({
        blocked_start_datetime: '',
        blocked_end_datetime: '',
        reason: ''
      });
      setEditingBlock(null);
      loadBlocks();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save blocked time slot');
    }
  };

  const handleEdit = (block) => {
    setEditingBlock(block);
    setFormData({
      blocked_start_datetime: toDateTimeLocalInput(block.blocked_start_datetime),
      blocked_end_datetime: toDateTimeLocalInput(block.blocked_end_datetime),
      reason: block.reason || ''
    });
  };

  const handleDelete = async (blockId) => {
    if (!window.confirm('Are you sure you want to remove this blocked time slot?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await deleteBlock(blockId);
      setSuccess('Blocked time slot removed successfully');
      setTimeout(() => setSuccess(''), 3000);
      loadBlocks();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove blocked time slot');
    }
  };

  const handleCancel = () => {
    setFormData({
      blocked_start_datetime: '',
      blocked_end_datetime: '',
      reason: ''
    });
    setEditingBlock(null);
    setError('');
  };

  const filteredVenues = venues.filter(venue =>
    venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    venue.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedVenueBlocks = selectedVenue
    ? blocks.filter(block => block.venue_id === selectedVenue.id)
    : [];

  const selectedVenueBookings = selectedVenue
    ? bookings.filter(booking => booking.venue_id === selectedVenue.id)
    : [];

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getBlocksForDay = (day) => {
    if (!selectedVenue) return [];
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dayStart = new Date(year, month, day, 0, 0, 0);
    const dayEnd = new Date(year, month, day, 23, 59, 59);
    
    return selectedVenueBlocks.filter(block => {
      const blockStart = new Date(block.blocked_start_datetime);
      const blockEnd = new Date(block.blocked_end_datetime);
      return (blockStart <= dayEnd && blockEnd >= dayStart);
    });
  };

  const getBookingsForDay = (day) => {
    if (!selectedVenue) return [];
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dayStart = new Date(year, month, day, 0, 0, 0);
    const dayEnd = new Date(year, month, day, 23, 59, 59);
    
    const dayBookings = selectedVenueBookings.filter(booking => {
      let bookingStart = new Date(booking.approved_start_datetime || booking.requested_start_datetime);
      let bookingEnd = new Date(booking.approved_end_datetime || booking.requested_end_datetime);
      
      // Include setup and teardown time
      if (booking.setup_time) {
        bookingStart = new Date(bookingStart.getTime() - booking.setup_time * 60 * 1000);
      }
      if (booking.teardown_time) {
        bookingEnd = new Date(bookingEnd.getTime() + booking.teardown_time * 60 * 1000);
      }
      
      return (bookingStart <= dayEnd && bookingEnd >= dayStart);
    });
    
    return dayBookings;
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="venue-availability-page">
      <div className="page-header">
        <div>
          <h1>🔒 Venue Availability Management</h1>
          <p>Block and unblock time slots for your faculty's venues</p>
        </div>
        <button onClick={() => navigate('/home')} className="back-button">
          ← Back to Home
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      <div className="availability-container">
        {/* Left Side: Venue Selection */}
        <div className="venue-selection-section">
          <h2>Select Venue</h2>
          
          <div className="search-box">
            <input
              type="text"
              placeholder="Search venues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="venue-search-input"
            />
          </div>

          <div className="venues-list">
            {loading ? (
              <div className="loading-venues">Loading venues...</div>
            ) : filteredVenues.length === 0 ? (
              <div className="no-venues">No venues found</div>
            ) : (
              filteredVenues.map(venue => (
                <div
                  key={venue.id}
                  className={`venue-item ${selectedVenue?.id === venue.id ? 'selected' : ''}`}
                  onClick={() => setSelectedVenue(venue)}
                >
                  <div className="venue-name">{venue.name}</div>
                  <div className="venue-code">{venue.code}</div>
                  {venue.location && <div className="venue-location">{venue.location}</div>}
                  {selectedVenue?.id === venue.id && (
                    <div className="selected-indicator">✓</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Block Management */}
        <div className="block-management-section">
          {!selectedVenue ? (
            <div className="no-selection">
              <p>👈 Select a venue from the left to manage its availability</p>
            </div>
          ) : (
            <>
              {/* Block Form */}
              <div className="block-form">
                <h2>{editingBlock ? 'Edit' : 'Create'} Blocked Time Slot</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Start Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={formData.blocked_start_datetime}
                        onChange={(e) => handleInputChange('blocked_start_datetime', e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>End Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={formData.blocked_end_datetime}
                        onChange={(e) => handleInputChange('blocked_end_datetime', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Reason (Optional)</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      placeholder="E.g., Maintenance, Faculty event, etc."
                      rows="2"
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-submit">
                      {editingBlock ? 'Update Block' : 'Block Time Slot'}
                    </button>
                    {editingBlock && (
                      <button type="button" onClick={handleCancel} className="btn-cancel">
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Calendar View */}
              <div className="calendar-section">
                <div className="calendar-header">
                  <button onClick={previousMonth} className="month-nav">‹</button>
                  <h3>{monthNames[month]} {year}</h3>
                  <button onClick={nextMonth} className="month-nav">›</button>
                </div>

                <div className="calendar-legend">
                  <div className="legend-item">
                    <span className="legend-bar booking-bar"></span>
                    <span>Approved Booking</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-bar block-bar"></span>
                    <span>Blocked Slot</span>
                  </div>
                </div>

                <div className="calendar-grid">
                  <div className="calendar-day-header">Sun</div>
                  <div className="calendar-day-header">Mon</div>
                  <div className="calendar-day-header">Tue</div>
                  <div className="calendar-day-header">Wed</div>
                  <div className="calendar-day-header">Thu</div>
                  <div className="calendar-day-header">Fri</div>
                  <div className="calendar-day-header">Sat</div>

                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: startingDayOfWeek }, (_, i) => (
                    <div key={`empty-${i}`} className="calendar-day empty"></div>
                  ))}

                  {/* Days of the month */}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dayBlocks = getBlocksForDay(day);
                    const dayBookings = getBookingsForDay(day);
                    const isToday = new Date().getDate() === day &&
                                  new Date().getMonth() === month &&
                                  new Date().getFullYear() === year;

                    const hasBlocks = dayBlocks.length > 0;
                    const hasBookings = dayBookings.length > 0;

                    return (
                      <div
                        key={day}
                        className={`calendar-day ${isToday ? 'today' : ''} ${hasBlocks ? 'has-blocks' : ''} ${hasBookings ? 'has-bookings' : ''}`}
                      >
                        <div className="day-number">{day}</div>
                        <div className="day-indicators">
                          {dayBookings.map(booking => {
                            let eventStart = new Date(booking.approved_start_datetime || booking.requested_start_datetime);
                            let eventEnd = new Date(booking.approved_end_datetime || booking.requested_end_datetime);
                            
                            // Include setup time and teardown time in the display
                            if (booking.setup_time) {
                              eventStart = new Date(eventStart.getTime() - booking.setup_time * 60 * 1000);
                            }
                            if (booking.teardown_time) {
                              eventEnd = new Date(eventEnd.getTime() + booking.teardown_time * 60 * 1000);
                            }
                            
                            const currentDay = new Date(year, month, day);
                            currentDay.setHours(0, 0, 0, 0);
                            const startsBeforeToday = eventStart < currentDay;
                            
                            const nextDay = new Date(year, month, day + 1);
                            nextDay.setHours(0, 0, 0, 0);
                            const endsAfterToday = eventEnd >= nextDay;
                            
                            const displayStartTime = startsBeforeToday 
                              ? '00:00' 
                              : eventStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                            
                            const displayEndTime = endsAfterToday
                              ? '23:59'
                              : eventEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                            
                            const eventName = booking.event?.event_name || 'N/A';
                            return (
                              <div
                                key={booking.id}
                                className="booking-bar-indicator"
                              >
                                <div style={{ whiteSpace: 'nowrap' }}>{displayStartTime} - {displayEndTime}</div>
                                <div>{eventName}</div>
                              </div>
                            );
                          })}
                          {dayBlocks.map(block => {
                            const blockStart = new Date(block.blocked_start_datetime);
                            const currentDay = new Date(year, month, day);
                            const startsBeforeToday = blockStart < currentDay;
                            
                            const displayTime = startsBeforeToday 
                              ? '00:00' 
                              : blockStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                            
                            const reason = block.reason || 'Blocked';
                            return (
                              <div
                                key={block.id}
                                className="block-bar-indicator"
                              >
                                <span className="bar-time">{displayTime}</span>
                                <span className="bar-name">{reason}</span>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Hover Tooltip */}
                        {(hasBookings || hasBlocks) && (
                          <div className="day-tooltip">
                            <div className="tooltip-header">
                              {monthNames[month]} {day}, {year}
                            </div>
                            {dayBookings.length > 0 && (
                              <div className="tooltip-section">
                                <div className="tooltip-section-title">📅 Approved Bookings ({dayBookings.length})</div>
                                {dayBookings.map(booking => {
                                  let eventStart = new Date(booking.approved_start_datetime || booking.requested_start_datetime);
                                  let eventEnd = new Date(booking.approved_end_datetime || booking.requested_end_datetime);
                                  
                                  // Include setup and teardown time
                                  if (booking.setup_time) {
                                    eventStart = new Date(eventStart.getTime() - booking.setup_time * 60 * 1000);
                                  }
                                  if (booking.teardown_time) {
                                    eventEnd = new Date(eventEnd.getTime() + booking.teardown_time * 60 * 1000);
                                  }
                                  
                                  const currentDay = new Date(year, month, day);
                                  const nextDay = new Date(year, month, day + 1);
                                  
                                  // Check if event starts before this day
                                  const startsBeforeToday = eventStart < currentDay;
                                  // Check if event ends after this day
                                  const endsAfterToday = eventEnd >= nextDay;
                                  
                                  const displayStart = startsBeforeToday ? '00:00' : eventStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                                  const displayEnd = endsAfterToday ? '23:59' : eventEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                                  
                                  const eventName = booking.event?.event_name || 'N/A';
                                  const isMultiDay = startsBeforeToday || endsAfterToday;
                                  
                                  return (
                                    <div key={booking.id} className="tooltip-item">
                                      <div className="tooltip-time">
                                        {displayStart} - {displayEnd}
                                        {isMultiDay && <span className="multi-day-badge">Multi-day</span>}
                                      </div>
                                      <div className="tooltip-name">{eventName}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {dayBlocks.length > 0 && (
                              <div className="tooltip-section">
                                <div className="tooltip-section-title">🔒 Blocked Slots ({dayBlocks.length})</div>
                                {dayBlocks.map(block => {
                                  const blockStart = new Date(block.blocked_start_datetime);
                                  const blockEnd = new Date(block.blocked_end_datetime);
                                  const currentDay = new Date(year, month, day);
                                  const nextDay = new Date(year, month, day + 1);
                                  
                                  // Check if block starts before this day
                                  const startsBeforeToday = blockStart < currentDay;
                                  // Check if block ends after this day
                                  const endsAfterToday = blockEnd >= nextDay;
                                  
                                  const displayStart = startsBeforeToday ? '00:00' : blockStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                                  const displayEnd = endsAfterToday ? '23:59' : blockEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                                  
                                  const reason = block.reason || 'No reason provided';
                                  const isMultiDay = startsBeforeToday || endsAfterToday;
                                  
                                  return (
                                    <div key={block.id} className="tooltip-item">
                                      <div className="tooltip-time">
                                        {displayStart} - {displayEnd}
                                        {isMultiDay && <span className="multi-day-badge">Multi-day</span>}
                                      </div>
                                      <div className="tooltip-name">{reason}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Blocked Slots List */}
              <div className="blocks-list-section">
                <h3 onClick={() => setShowBlocksList(!showBlocksList)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>{showBlocksList ? '▼' : '▶'}</span>
                  Blocked Time Slots ({selectedVenueBlocks.length})
                </h3>
                {showBlocksList && (
                  selectedVenueBlocks.length === 0 ? (
                    <div className="no-blocks">
                      <p>No blocked time slots for this venue.</p>
                    </div>
                  ) : (
                    <div className="blocks-list">
                      {selectedVenueBlocks.map(block => (
                        <div key={block.id} className="block-item">
                          <div className="block-info">
                            <div className="block-time">
                              <strong>From:</strong> {formatDateTime(block.blocked_start_datetime)}
                              <br />
                              <strong>To:</strong> {formatDateTime(block.blocked_end_datetime)}
                            </div>
                            {block.reason && (
                              <div className="block-reason">
                                <strong>Reason:</strong> {block.reason}
                              </div>
                            )}
                          </div>
                          <div className="block-actions">
                            <button onClick={() => handleEdit(block)} className="btn-edit">
                              Edit
                            </button>
                            <button onClick={() => handleDelete(block.id)} className="btn-delete">
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default VenueAvailabilityPage;
