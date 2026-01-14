/**
 * Format a date/time range for event invitations (includes setup/teardown)
 * @param {string} startDateTime - ISO start datetime
 * @param {string} endDateTime - ISO end datetime
 * @param {number} setupMinutes - Setup time in minutes
 * @param {number} teardownMinutes - Teardown time in minutes
 * @returns {string} Formatted range e.g., "Jan 15, 2026 2:00 PM - 5:00 PM (+ 30 min setup/teardown)"
 */
export const formatEventTimeRange = (startDateTime, endDateTime, setupMinutes = 0, teardownMinutes = 0) => {
  if (!startDateTime || !endDateTime) return 'N/A';
  
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  
  const dateStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  const startTimeStr = start.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  const endTimeStr = end.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  let range = `${dateStr} ${startTimeStr} - ${endTimeStr}`;
  
  if (setupMinutes > 0 || teardownMinutes > 0) {
    const totalExtra = setupMinutes + teardownMinutes;
    range += ` (+ ${totalExtra} min setup/teardown)`;
  }
  
  return range;
};

/**
 * Get the actual event start time including setup
 * @param {Date} startDateTime - Event start datetime
 * @param {number} setupMinutes - Setup time in minutes
 * @returns {Date} Actual start time (earlier than event start)
 */
export const getActualEventStart = (startDateTime, setupMinutes = 0) => {
  if (!startDateTime) return null;
  const date = new Date(startDateTime);
  date.setMinutes(date.getMinutes() - setupMinutes);
  return date;
};

/**
 * Get the actual event end time including teardown
 * @param {Date} endDateTime - Event end datetime
 * @param {number} teardownMinutes - Teardown time in minutes
 * @returns {Date} Actual end time (later than event end)
 */
export const getActualEventEnd = (endDateTime, teardownMinutes = 0) => {
  if (!endDateTime) return null;
  const date = new Date(endDateTime);
  date.setMinutes(date.getMinutes() + teardownMinutes);
  return date;
};
