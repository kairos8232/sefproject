import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const hasToken = authService.isAuthenticated();
  const isExpired = hasToken && authService.isTokenExpired();
  const [isChecking, setIsChecking] = useState(isExpired);
  const [isAllowed, setIsAllowed] = useState(hasToken && !isExpired);

  useEffect(() => {
    let isMounted = true;
    const refreshIfNeeded = async () => {
      if (!hasToken) {
        if (isMounted) {
          setIsAllowed(false);
          setIsChecking(false);
        }
        return;
      }

      if (!isExpired) {
        if (isMounted) {
          setIsAllowed(true);
          setIsChecking(false);
        }
        return;
      }

      const refreshed = await authService.refreshAccessToken();
      if (!isMounted) return;
      setIsAllowed(refreshed);
      setIsChecking(false);
    };

    refreshIfNeeded();
    return () => {
      isMounted = false;
    };
  }, [hasToken, isExpired]);

  if (isChecking) {
    return null;
  }

  if (!isAllowed) {
    authService.clearSession(true);
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
