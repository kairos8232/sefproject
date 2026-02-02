import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAllowed, setIsAllowed] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        console.log('[ProtectedRoute] Starting authentication check...');
        
        // Check authentication status
        const hasToken = authService.isAuthenticated();
        
        if (!hasToken) {
          console.log('[ProtectedRoute] No token found, redirecting to login');
          if (isMounted) {
            authService.clearSession(false); // Don't mark as expired, just clear
            // Use navigate instead of Navigate component
            setTimeout(() => {
              navigate('/login', { replace: true, state: { from: location } });
            }, 0);
          }
          return;
        }

        // Check if token is expired
        const isExpired = authService.isTokenExpired();
        
        if (!isExpired) {
          console.log('[ProtectedRoute] Token valid, allowing access');
          if (isMounted) {
            setIsAllowed(true);
          }
          return;
        }

        // Token is expired, try to refresh silently
        console.log('[ProtectedRoute] Token expired, attempting silent refresh...');
        const refreshed = await authService.refreshAccessToken();
        console.log('[ProtectedRoute] Refresh result:', refreshed);
        
        if (isMounted) {
          if (refreshed) {
            setIsAllowed(true);
          } else {
            authService.clearSession(true); // Mark as expired when refresh fails
            // Use navigate instead of Navigate component
            setTimeout(() => {
              navigate('/login', { replace: true, state: { from: location } });
            }, 0);
          }
        }
      } catch (error) {
        console.error('[ProtectedRoute] Error during auth check:', error);
        // On error, deny access
        if (isMounted) {
          authService.clearSession(true); // Mark as expired on error
          // Use navigate instead of Navigate component
          setTimeout(() => {
            navigate('/login', { replace: true, state: { from: location } });
          }, 0);
        }
      }
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [navigate, location]); // Include navigate and location in dependencies

  // Show loading spinner while checking authentication
  if (isAllowed === null) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#666', fontSize: '14px' }}>Verifying session...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If not allowed, navigation already triggered in useEffect
  if (!isAllowed) {
    return null;
  }

  // User is authenticated
  return children;
}

export default ProtectedRoute;
