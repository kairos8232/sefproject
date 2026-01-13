import React, { useState, useEffect, useCallback, useRef } from 'react';
import './SessionTimeoutModal.css';

const SessionTimeoutModal = ({ onExtendSession, onLogout }) => {
  const [showModal, setShowModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const warningTimeoutRef = useRef(null);
  const logoutTimeoutRef = useRef(null);

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

  const clearTimeouts = useCallback(() => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }
  }, []);

  const handleAutoLogout = useCallback(() => {
    setShowModal(false);
    onLogout();
  }, [onLogout]);

  const setupTimeouts = useCallback(() => {
    clearTimeouts();
    
    const expiry = getTokenExpiry();
    if (!expiry) return;

    const now = Date.now();
    const timeUntilExpiry = expiry - now;
    
    // Show warning 2 minutes before expiry
    const WARNING_TIME = 2 * 60 * 1000; // 2 minutes
    const timeUntilWarning = timeUntilExpiry - WARNING_TIME;

    if (timeUntilWarning > 0) {
      warningTimeoutRef.current = setTimeout(() => {
        setShowModal(true);
        setTimeRemaining(120); // 2 minutes in seconds
      }, timeUntilWarning);

      // Auto-logout when token expires
      logoutTimeoutRef.current = setTimeout(() => {
        handleAutoLogout();
      }, timeUntilExpiry);
    } else if (timeUntilExpiry > 0) {
      // Token expires soon, show warning immediately
      setShowModal(true);
      setTimeRemaining(Math.floor(timeUntilExpiry / 1000));
      
      logoutTimeoutRef.current = setTimeout(() => {
        handleAutoLogout();
      }, timeUntilExpiry);
    } else {
      // Token already expired
      handleAutoLogout();
    }
  }, [clearTimeouts, getTokenExpiry, handleAutoLogout]);

  const handleExtendSession = async () => {
    try {
      await onExtendSession();
      setShowModal(false);
      // Setup new timeouts for the refreshed token
      setTimeout(() => setupTimeouts(), 100);
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

  // Setup timeouts on mount and when token changes
  useEffect(() => {
    setupTimeouts();

    // Listen for token updates
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        setupTimeouts();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event when token is updated
    const handleTokenUpdate = () => {
      setupTimeouts();
    };
    window.addEventListener('tokenUpdated', handleTokenUpdate);

    return () => {
      clearTimeouts();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenUpdated', handleTokenUpdate);
    };
  }, [setupTimeouts, clearTimeouts]);

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
          Are you still there? Click "Stay Logged In" to continue your session.
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
