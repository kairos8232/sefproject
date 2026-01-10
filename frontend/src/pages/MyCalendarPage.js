import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import participationService from '../services/participationService';
import './MyCalendarPage.css';

function MyCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    venueStatus: 'approved'
  });
  const navigate = useNavigate();

  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get month range
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      
      const params = {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString()
      };

      if (filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters.venueStatus !== 'all') {
        params.venueStatus = filters.venueStatus;
      }

      const response = await participationService.getCalendarData(params);
      setEvents(response.events || []);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, filters]);

  useEffect(() => {
    document.title = 'My Calendar - CESMS';
    loadCalendarData();
  }, [loadCalendarData]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    
    const eventsForDay = events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return eventStart <= dayEnd && eventEnd >= dayStart;
    }).map(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Calculate display start and end for this specific day
      const displayStart = eventStart < dayStart ? dayStart : eventStart;
      const displayEnd = eventEnd > dayEnd ? dayEnd : eventEnd;
      
      return {
        ...event,
        displayStart: displayStart.toISOString(),
        displayEnd: displayEnd.toISOString(),
        isMultiDay: eventStart.toDateString() !== eventEnd.toDateString(),
        startsToday: eventStart >= dayStart && eventStart <= dayEnd,
        endsToday: eventEnd >= dayStart && eventEnd <= dayEnd
      };
    });
    
    // Limit to 3 events per day to prevent overflow
    return eventsForDay.slice(0, 3);
  };

  const getEventTimeDisplay = (event) => {
    const start = formatTime(event.displayStart);
    const end = formatTime(event.displayEnd);
    
    if (event.isMultiDay) {
      if (!event.startsToday && !event.endsToday) {
        return '00:00 - 23:59';
      } else if (!event.startsToday) {
        return `00:00 - ${end}`;
      } else if (!event.endsToday) {
        return `${start} - 23:59`;
      }
    }
    return `${start} - ${end}`;
  };

  const truncateEventName = (name, maxLength = 20) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isCurrentMonth = (date) => {
    if (!date) return false;
    return date.getMonth() === currentDate.getMonth();
  };

  const formatTime = (datetime) => {
    const date = new Date(datetime);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getEventClass = (event) => {
    if (event.type === 'participation') {
      return 'cal-event-participation';
    } else if (event.type === 'created') {
      return 'cal-event-created';
    }
    return 'cal-event-participation';
  };

  const getEventIcon = (type) => {
    if (type === 'participation') return '👤';
    if (type === 'created') return '📝';
    return '';
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="my-calendar-page">
      <div className="cal-header">
        <div className="cal-title-section">
          <h1 className="cal-title">My Calendar</h1>
          <p className="cal-subtitle">
            View events you're participating in and events you've created
          </p>
        </div>
        <button onClick={() => navigate('/home')} className="cal-back-button">
          Back to Home
        </button>
      </div>

      <div className="cal-controls">
        <div className="cal-nav-section">
          <button onClick={previousMonth} className="cal-nav-btn">
            ←
          </button>
          <div className="cal-month-display">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <button onClick={nextMonth} className="cal-nav-btn">
            →
          </button>
        </div>

        <button onClick={goToToday} className="cal-today-btn">
          Today
        </button>

        <div className="cal-filters">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="cal-filter-select"
          >
            <option value="all">All Events</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={filters.venueStatus}
            onChange={(e) => setFilters({ ...filters, venueStatus: e.target.value })}
            className="cal-filter-select"
          >
            <option value="approved">Approved Venues Only</option>
            <option value="pending">Pending Venues</option>
            <option value="rejected">Rejected Venues</option>
            <option value="all">All Venue Statuses</option>
          </select>
        </div>
      </div>

      {/* Color Legend */}
      <div className="cal-color-legend">
        <div className="cal-color-legend-items">
          <div className="cal-color-legend-item">
            <div className="cal-color-sample cal-event-participation" style={{ borderLeftColor: '#1565c0' }}></div>
            <span className="cal-color-label">👤 Participating Event (Actual Time)</span>
          </div>
          <div className="cal-color-legend-item">
            <div className="cal-color-sample cal-event-created" style={{ borderLeftColor: '#2e7d32' }}></div>
            <span className="cal-color-label">📝 Created Event (Includes Setup/Teardown)</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="cal-loading">Loading calendar...</div>
      ) : (
        <div className="cal-grid-container">
          <div className="cal-grid-header">
            {dayNames.map(day => (
              <div key={day} className="cal-day-name">
                {day}
              </div>
            ))}
          </div>
          
          <div className="cal-grid">
            {getDaysInMonth().map((date, index) => (
              <div
                key={index}
                className={`cal-day-cell ${!date ? 'cal-day-empty' : ''} ${
                  isToday(date) ? 'cal-day-today' : ''
                } ${!isCurrentMonth(date) ? 'cal-day-other-month' : ''}`}
              >
                {date && (
                  <>
                    <div className="cal-day-number">{date.getDate()}</div>
                    <div className="cal-day-events">
                      {getEventsForDate(date).map((event, idx) => (
                        <div
                          key={idx}
                          className={`cal-event-item ${getEventClass(event)}`}
                          onClick={() => navigate(`/events/${event.id}`, { state: { fromCalendar: true } })}
                          title={`${event.title}\n${getEventTimeDisplay(event)}\nType: ${event.type === 'participation' ? 'Participating' : 'Created'}${event.isMultiDay ? '\n(Multi-day event)' : ''}`}
                        >
                          <div className="cal-event-time-row">
                            <span className="cal-event-icon">{getEventIcon(event.type)}</span>
                            <span className="cal-event-time">{getEventTimeDisplay(event)}</span>
                          </div>
                          <div className="cal-event-name">{truncateEventName(event.title)}</div>
                        </div>
                      ))}
                      {getEventsForDate(date).length === 0 ? null : (
                        events.filter(event => {
                          const eventStart = new Date(event.start);
                          const eventEnd = new Date(event.end);
                          const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                          const nextDay = new Date(checkDate);
                          nextDay.setDate(nextDay.getDate() + 1);
                          return eventStart < nextDay && eventEnd >= checkDate;
                        }).length > 3 && (
                          <div className="cal-more-events">
                            +{events.filter(event => {
                              const eventStart = new Date(event.start);
                              const eventEnd = new Date(event.end);
                              const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                              const nextDay = new Date(checkDate);
                              nextDay.setDate(nextDay.getDate() + 1);
                              return eventStart < nextDay && eventEnd >= checkDate;
                            }).length - 3} more
                          </div>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="cal-no-events">
          <p>No events found for this month</p>
          <p className="cal-no-events-hint">
            Try changing the filters or browse events to register for new ones
          </p>
          <button onClick={() => navigate('/events')} className="cal-browse-btn">
            Browse Events
          </button>
        </div>
      )}
    </div>
  );
}

export default MyCalendarPage;
