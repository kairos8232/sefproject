import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const hasToken = authService.isAuthenticated();
  const isExpired = hasToken && authService.isTokenExpired();

  if (!hasToken || isExpired) {
    authService.clearSession(isExpired);
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
