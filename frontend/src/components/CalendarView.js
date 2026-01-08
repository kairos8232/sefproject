import React from 'react';
import './CalendarView.css';

const CalendarView = ({
  type, // 'venue' or 'resource'
  bookings,
  venueBlocks = [], // Venue availability blocks (only for venue type)
  faculties = [], // Faculties list (only for venue type)
  selectedFaculty,
  setSelectedFaculty,
  selectedId,
  setSelectedId,
  items, // venues or resources
  currentMonth,
  setCurrentMonth,
  getStatusBadgeClass
}) => {
  const [statusFilter, setStatusFilter] = React.useState('all'); // 'all', 'pending', 'approved', 'rejected', 'cancelled', 'blocked'
  
  // Filter items by faculty (for venues only)
  const filteredItems = type === 'venue' && selectedFaculty && Array.isArray(items)
    ? items.filter(item => item.faculty_id === selectedFaculty)
    : Array.isArray(items) ? items : [];

  // Filter bookings by status
  const filteredBookings = statusFilter === 'all' 
    ? bookings 
    : statusFilter === 'blocked'
    ? [] // Don't show bookings when 'blocked' filter is selected
    : bookings.filter(b => b.status === statusFilter);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

  const getBookingsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const dayBookings = filteredBookings.filter(booking => {
      const startDate = new Date(
        type === 'venue' 
          ? (booking.approved_start_datetime || booking.requested_start_datetime)
          : booking.usage_start_datetime
      );
      const endDate = new Date(
        type === 'venue'
          ? (booking.approved_end_datetime || booking.requested_end_datetime)
          : booking.usage_end_datetime
      );
      
      const checkDate = new Date(dateStr);
      checkDate.setHours(0, 0, 0, 0);
      const startDateOnly = new Date(startDate);
      startDateOnly.setHours(0, 0, 0, 0);
      const endDateOnly = new Date(endDate);
      endDateOnly.setHours(0, 0, 0, 0);
      
      const matches = checkDate >= startDateOnly && checkDate <= endDateOnly;
      
      return matches;
    });
    
    return dayBookings;
  };

  const getBlocksForDay = (day) => {
    if (type !== 'venue' || !venueBlocks || venueBlocks.length === 0) return [];
    
    // If status filter is set to something other than 'all' or 'blocked', don't show blocks
    if (statusFilter !== 'all' && statusFilter !== 'blocked') return [];
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const dayBlocks = venueBlocks.filter(block => {
      const startDate = new Date(block.blocked_start_datetime);
      const endDate = new Date(block.blocked_end_datetime);
      
      const checkDate = new Date(dateStr);
      checkDate.setHours(0, 0, 0, 0);
      const startDateOnly = new Date(startDate);
      startDateOnly.setHours(0, 0, 0, 0);
      const endDateOnly = new Date(endDate);
      endDateOnly.setHours(0, 0, 0, 0);
      
      return checkDate >= startDateOnly && checkDate <= endDateOnly;
    });
    
    return dayBlocks;
  };

  const getBlockTimeDisplay = (block, day) => {
    const startDate = new Date(block.blocked_start_datetime);
    const endDate = new Date(block.blocked_end_datetime);

    const currentDay = new Date(year, month, day);
    currentDay.setHours(0, 0, 0, 0);
    
    const startDay = new Date(startDate);
    startDay.setHours(0, 0, 0, 0);
    
    const endDay = new Date(endDate);
    endDay.setHours(0, 0, 0, 0);

    const isFirstDay = currentDay.getTime() === startDay.getTime();
    const isLastDay = currentDay.getTime() === endDay.getTime();
    const isMiddleDay = currentDay > startDay && currentDay < endDay;

    if (isFirstDay && isLastDay) {
      return `${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    } else if (isFirstDay) {
      return `${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - 23:59`;
    } else if (isLastDay) {
      return `00:00 - ${endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    } else if (isMiddleDay) {
      return '00:00 - 23:59';
    }
    
    return '';
  };

  const getEventTimeDisplay = (booking, day) => {
    const setupTime = booking.setup_time || 0;
    const teardownTime = booking.teardown_time || 0;
    
    const startDate = new Date(
      type === 'venue' 
        ? (booking.approved_start_datetime || booking.requested_start_datetime)
        : booking.usage_start_datetime
    );
    const endDate = new Date(
      type === 'venue'
        ? (booking.approved_end_datetime || booking.requested_end_datetime)
        : booking.usage_end_datetime
    );

    // Include setup time before start
    const actualStart = new Date(startDate.getTime() - setupTime * 60 * 1000);
    // Include teardown time after end
    const actualEnd = new Date(endDate.getTime() + teardownTime * 60 * 1000);

    const currentDay = new Date(year, month, day);
    currentDay.setHours(0, 0, 0, 0);
    
    const startDay = new Date(actualStart);
    startDay.setHours(0, 0, 0, 0);
    
    const endDay = new Date(actualEnd);
    endDay.setHours(0, 0, 0, 0);

    const isFirstDay = currentDay.getTime() === startDay.getTime();
    const isLastDay = currentDay.getTime() === endDay.getTime();
    const isMiddleDay = currentDay > startDay && currentDay < endDay;

    if (isFirstDay && isLastDay) {
      // Single day event
      return `${actualStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${actualEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    } else if (isFirstDay) {
      // First day of multi-day event
      return `${actualStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - 23:59`;
    } else if (isLastDay) {
      // Last day of multi-day event
      return `00:00 - ${actualEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    } else if (isMiddleDay) {
      // Middle day of multi-day event
      return '00:00 - 23:59';
    }
    
    return '';
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const selectedItem = Array.isArray(items) ? items.find(item => item.id === selectedId) : null;

  return (
    <div className="booking-requests-calendar-view">
      <div className="calendar-header">
        {type === 'venue' && faculties && faculties.length > 0 && (
          <div className="calendar-dropdown">
            <label>Faculty:</label>
            <select 
              value={selectedFaculty || ''} 
              onChange={(e) => {
                const newFacultyId = parseInt(e.target.value);
                setSelectedFaculty(newFacultyId);
                if (Array.isArray(items)) {
                  const facultyVenues = items.filter(v => v.faculty_id === newFacultyId);
                  if (facultyVenues.length > 0) {
                    setSelectedId(facultyVenues[0].id);
                  }
                }
              }}
            >
              {faculties.map(faculty => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="calendar-dropdown">
          <label>{type === 'venue' ? 'Venue:' : 'Resource:'}</label>
          <select 
            value={selectedId || ''} 
            onChange={(e) => {
              const newId = parseInt(e.target.value);
              setSelectedId(newId);
            }}
          >
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name || item.resource_name}
                </option>
              ))
            ) : (
              <option value="">No {type === 'venue' ? 'venues' : 'resources'} available</option>
            )}
          </select>
        </div>
        
        <div className="calendar-navigation">
          <button onClick={prevMonth}>◀</button>
          <h3>{monthNames[month]} {year}</h3>
          <button onClick={nextMonth}>▶</button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="br-cal-status-filter">
        <button 
          className={statusFilter === 'all' ? 'active' : ''}
          onClick={() => setStatusFilter('all')}
        >
          All
        </button>
        <button 
          className={statusFilter === 'pending' ? 'active' : ''}
          onClick={() => setStatusFilter('pending')}
        >
          Pending
        </button>
        <button 
          className={statusFilter === 'approved' ? 'active' : ''}
          onClick={() => setStatusFilter('approved')}
        >
          Approved
        </button>
        <button 
          className={statusFilter === 'rejected' ? 'active' : ''}
          onClick={() => setStatusFilter('rejected')}
        >
          Rejected
        </button>
        <button 
          className={statusFilter === 'cancelled' ? 'active' : ''}
          onClick={() => setStatusFilter('cancelled')}
        >
          Cancelled
        </button>
        {type === 'venue' && (
          <button 
            className={statusFilter === 'blocked' ? 'active' : ''}
            onClick={() => setStatusFilter('blocked')}
          >
            Blocked
          </button>
        )}
      </div>

      {selectedItem && type === 'venue' && (
        <div className="venue-info">
          <small>
            {selectedItem.faculty?.name} | Capacity: {selectedItem.capacity} | 
            {selectedItem.has_av_equipment ? ' ✓ AV Equipment' : ''} 
            {selectedItem.has_accessibility_features ? ' ✓ Accessible' : ''}
          </small>
        </div>
      )}

      {selectedItem && type === 'resource' && (
        <div className="resource-info">
          <small>
            {selectedItem.category?.name} | Available: {selectedItem.quantity_available}
          </small>
        </div>
      )}

      <div className="br-cal-grid">
        <div className="br-cal-weekdays">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        <div className="br-cal-days">
          {[...Array(startingDayOfWeek)].map((_, i) => (
            <div key={`empty-${i}`} className="br-cal-day br-cal-empty"></div>
          ))}

          {[...Array(daysInMonth)].map((_, i) => {
            const day = i + 1;
            const dayBookings = getBookingsForDay(day);
            const dayBlocks = getBlocksForDay(day);
            const isToday = new Date().getDate() === day &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year;

            return (
              <div
                key={day}
                className={`br-cal-day ${isToday ? 'br-cal-today' : ''} ${(dayBookings.length > 0 || dayBlocks.length > 0) ? 'br-cal-has-bookings' : ''}`}
              >
                <div className="br-cal-day-number">{day}</div>
                <div className="br-cal-day-bookings">
                  {/* Show venue blocks first (unavailable periods) */}
                  {dayBlocks.map(block => {
                    const timeDisplay = getBlockTimeDisplay(block, day);
                    return (
                      <div
                        key={`block-${block.id}`}
                        className="br-cal-booking-block br-cal-blocked"
                        title={`UNAVAILABLE\n${timeDisplay}\n${block.reason || 'Blocked'}`}
                      >
                        <div className="br-cal-event-time">{timeDisplay}</div>
                        <small>🚫 {block.reason || 'Unavailable'}</small>
                      </div>
                    );
                  })}
                  
                  {/* Show bookings */}
                  {dayBookings.map(booking => {
                    const timeDisplay = getEventTimeDisplay(booking, day);
                    const displayName = type === 'venue' 
                      ? (booking.event?.event_name || 'Event')
                      : (booking.resource?.name || 'Resource');
                    return (
                      <div
                        key={booking.id}
                        className={`br-cal-booking-block ${getStatusBadgeClass(booking.status)}`}
                        title={`${displayName} - ${booking.status}\n${timeDisplay}`}
                      >
                        <div className="br-cal-event-time">{timeDisplay}</div>
                        <small>{displayName}</small>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="br-cal-legend">
        <div className="br-cal-legend-item">
          <span className="br-cal-legend-color status-pending"></span> Pending
        </div>
        <div className="br-cal-legend-item">
          <span className="br-cal-legend-color status-approved"></span> Approved
        </div>
        <div className="br-cal-legend-item">
          <span className="br-cal-legend-color status-rejected"></span> Rejected
        </div>
        <div className="br-cal-legend-item">
          <span className="br-cal-legend-color status-cancelled"></span> Cancelled
        </div>
        {type === 'venue' && (
          <div className="br-cal-legend-item">
            <span className="br-cal-legend-color br-cal-blocked"></span> Blocked
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView;
