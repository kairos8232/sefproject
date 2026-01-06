// Centralized date/time formatting utilities
// All functions use the user's local timezone

/**
 * Format a date-time string to display in user's local timezone
 * @param {string} dateString - ISO date string from backend
 * @returns {string} Formatted date-time string
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format a date string to display only the date in user's local timezone
 * @param {string} dateString - ISO date string from backend
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Convert ISO datetime string to datetime-local input format (in local timezone)
 * @param {string} isoString - ISO date string from backend
 * @returns {string} Format: YYYY-MM-DDTHH:mm for datetime-local input
 */
export const toDateTimeLocalInput = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  // Get local timezone offset
  const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
  const localISOTime = new Date(date.getTime() - tzOffset).toISOString();
  return localISOTime.slice(0, 16); // YYYY-MM-DDTHH:mm
};

/**
 * Convert datetime-local input value to ISO string (UTC)
 * @param {string} localDateTime - Value from datetime-local input
 * @returns {string} ISO date string in UTC
 */
export const fromDateTimeLocalInput = (localDateTime) => {
  if (!localDateTime) return '';
  const date = new Date(localDateTime);
  return date.toISOString();
};

/**
 * Format time only in user's local timezone
 * @param {string} dateString - ISO date string from backend
 * @returns {string} Formatted time string
 */
export const formatTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 * @param {string} dateString - ISO date string from backend
 * @returns {string} Relative time string
 */
export const getRelativeTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date - now;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (Math.abs(diffMins) < 60) {
    return diffMins === 0 ? 'Just now' : 
           diffMins > 0 ? `In ${diffMins} minute${diffMins !== 1 ? 's' : ''}` :
           `${Math.abs(diffMins)} minute${Math.abs(diffMins) !== 1 ? 's' : ''} ago`;
  } else if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}` :
           `${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''} ago`;
  } else {
    return diffDays > 0 ? `In ${diffDays} day${diffDays !== 1 ? 's' : ''}` :
           `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
  }
};
