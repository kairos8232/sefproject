import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const [isAllowed, setIsAllowed] = useState(null);
  const navigationAttemptRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      // Check authentication status
      const hasToken = authService.isAuthenticated();
      
      if (!hasToken) {
        if (isMounted) {
          setIsAllowed(false);
        }
        return;
      }

      // Check if token is expired
      const isExpired = authService.isTokenExpired();
      
      if (!isExpired) {
        if (isMounted) {
          setIsAllowed(true);
        }
        return;
      }

      // Token is expired, try to refresh silently
      console.log('[ProtectedRoute] Token expired, attempting silent refresh...');
      const refreshed = await authService.refreshAccessToken();
      if (isMounted) {
        setIsAllowed(refreshed);
      }
      // If refresh fails, SessionTimeoutModal will handle logout instead
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Show nothing while checking authentication
  if (isAllowed === null) {
    return null;
  }

  // If not allowed, navigate to login (only once)
  if (!isAllowed) {
    if (!navigationAttemptRef.current) {
      navigationAttemptRef.current = true;
      authService.clearSession(true);
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return null;
  }

  // User is authenticated
  return children;
}

export default ProtectedRoute;
