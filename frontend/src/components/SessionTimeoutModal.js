import React, { useState, useEffect, useCallback, useRef } from 'react';
import authService from '../services/authService';
import './SessionTimeoutModal.css';

// Constants - defined outside component to avoid recreating on each render
const IDLE_WARNING_TIME = 13 * 60 * 1000; // 13 minutes of idle time before warning
const IDLE_LOGOUT_TIME = 15 * 60 * 1000; // 15 minutes of idle time before logout
const AUTO_REFRESH_THRESHOLD = 3 * 60 * 1000; // Auto-refresh if JWT expires in < 3 minutes
const ACTIVITY_CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

const SessionTimeoutModal = ({ onExtendSession, onLogout }) => {
  const [showModal, setShowModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const warningTimeoutRef = useRef(null);
  const logoutTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const activityCheckIntervalRef = useRef(null);

  const getTokenExpiry = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // Convert to milliseconds
    } catch (err) {
      console.error('Error parsing token:', err);
      return null;
    }
  }, []);

  const handleAutoLogout = useCallback(() => {
    setShowModal(false);
    localStorage.setItem('sessionExpired', 'true');
    localStorage.setItem('sessionExpiredMessage', 'Your session has ended due to inactivity. Please log in again.');
    onLogout();
  }, [onLogout]);

  // Check if token is about to expire and show warning
  const checkTokenExpiry = useCallback(() => {
    const tokenExpiry = getTokenExpiry();
    if (!tokenExpiry) return;

    const now = Date.now();
    const timeUntilExpiry = tokenExpiry - now;
    const timeBeforeWarning = 2 * 60 * 1000; // Warn 2 minutes before expiry

    // If token expires in less than 2 minutes, show the modal
    if (timeUntilExpiry > 0 && timeUntilExpiry <= timeBeforeWarning) {
      console.log('[SessionTimeoutModal] Token expiring soon, showing warning. Time until expiry:', Math.floor(timeUntilExpiry / 1000), 'seconds');
      setShowModal(true);
      setTimeRemaining(Math.floor(timeUntilExpiry / 1000));
      return true;
    }

    // If token already expired, logout immediately
    if (timeUntilExpiry <= 0) {
      console.log('[SessionTimeoutModal] Token expired, logging out');
      handleAutoLogout();
      return true;
    }

    return false;
  }, [getTokenExpiry, handleAutoLogout]);

  const clearTimeouts = useCallback(() => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }
    if (activityCheckIntervalRef.current) {
      clearInterval(activityCheckIntervalRef.current);
      activityCheckIntervalRef.current = null;
    }
  }, []);

  // Update last activity time
  const updateActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    
    // Hide modal if it's showing (user is active)
    if (showModal) {
      setShowModal(false);
    }
  }, [showModal]);

  const setupTimeouts = useCallback(() => {
    clearTimeouts();
    
    const now = Date.now();
    lastActivityRef.current = now;

    // Warning timeout: show warning after IDLE_WARNING_TIME of inactivity
    warningTimeoutRef.current = setTimeout(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity >= IDLE_WARNING_TIME) {
        setShowModal(true);
        const warningDuration = (IDLE_LOGOUT_TIME - IDLE_WARNING_TIME) / 1000;
        setTimeRemaining(Math.floor(warningDuration));
        console.log('Session warning shown, time remaining:', Math.floor(warningDuration), 'seconds');
      }
    }, IDLE_WARNING_TIME);

    // Logout timeout: auto-logout after IDLE_LOGOUT_TIME of inactivity
    logoutTimeoutRef.current = setTimeout(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity >= IDLE_LOGOUT_TIME) {
        handleAutoLogout();
      }
    }, IDLE_LOGOUT_TIME);

    // Periodic check: verify idle time and adjust warnings
    activityCheckIntervalRef.current = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      
      // First, check if token is expiring
      if (checkTokenExpiry()) {
        return; // Token expiry modal is now showing or logout happened
      }
      
      // If user was active, reset timeouts
      if (timeSinceLastActivity < IDLE_WARNING_TIME) {
        if (showModal) {
          setShowModal(false);
        }
        // Reset timeouts
        setupTimeouts();
      } else if (timeSinceLastActivity >= IDLE_LOGOUT_TIME) {
        // Auto-logout if idle time exceeded
        handleAutoLogout();
      } else if (timeSinceLastActivity >= IDLE_WARNING_TIME && !showModal) {
        // Show warning if idle time reached warning threshold
        setShowModal(true);
        const remainingTime = IDLE_LOGOUT_TIME - timeSinceLastActivity;
        setTimeRemaining(Math.floor(remainingTime / 1000));
      }
    }, ACTIVITY_CHECK_INTERVAL);
  }, [clearTimeouts, handleAutoLogout, showModal, checkTokenExpiry]);

  const handleExtendSession = async () => {
    try {
      console.log('[SessionTimeoutModal] User clicked Stay Logged In, refreshing token...');
      await onExtendSession();
      setShowModal(false);
      // Reset activity time to NOW and restart timeouts
      lastActivityRef.current = Date.now();
      clearTimeouts();
      setupTimeouts();
      console.log('[SessionTimeoutModal] Session extended, timer reset');
    } catch (err) {
      console.error('Failed to extend session:', err);
      handleAutoLogout();
    }
  };

  const handleLogoutClick = () => {
    setShowModal(false);
    onLogout();
  };

  // Countdown timer
  useEffect(() => {
    if (!showModal || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showModal, timeRemaining]);

  // Setup activity listeners
  useEffect(() => {
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    // Add activity listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [updateActivity]);

  // Setup timeouts on mount and when token changes
  useEffect(() => {
    setupTimeouts();

    // Listen for token updates
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        lastActivityRef.current = Date.now();
        setupTimeouts();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event when token is updated
    const handleTokenUpdate = () => {
      lastActivityRef.current = Date.now();
      setupTimeouts();
    };
    window.addEventListener('tokenUpdated', handleTokenUpdate);

    return () => {
      clearTimeouts();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenUpdated', handleTokenUpdate);
    };
  }, [setupTimeouts, clearTimeouts, getTokenExpiry]);

  if (!showModal) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="session-timeout-overlay">
      <div className="session-timeout-modal">
        <div className="session-timeout-icon">⏰</div>
        <h2>Session Expiring Soon</h2>
        <p>Your session will expire in:</p>
        <div className="session-timeout-timer">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
        <p className="session-timeout-message">
          You've been inactive. Click "Stay Logged In" to continue your session.
        </p>
        <div className="session-timeout-buttons">
          <button 
            onClick={handleExtendSession}
            className="btn-stay-logged-in"
          >
            Stay Logged In
          </button>
          <button 
            onClick={handleLogoutClick}
            className="btn-logout-now"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutModal;
