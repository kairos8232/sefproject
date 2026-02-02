import apiClient from './apiClient';

// Authentication service
const authService = {
  // login(email, password) - corresponds to UI -> C: login(email, password)
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Store token issue time for proactive refresh
        localStorage.setItem('tokenIssueTime', Date.now().toString());
        
        // Generate unique tab ID for multi-tab sync
        sessionStorage.setItem('tabId', Math.random().toString(36).substr(2, 9));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || 'Login failed';
    }
  },

  logout: async () => {
    try {
      // UC-02: Invalidate session and clear session data
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Even if API call fails, clear local data
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  isTokenExpired: () => {
    const token = localStorage.getItem('token');
    if (!token) return true;

    try {
      const payload = token.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(normalized));
      if (!decoded?.exp) return true;
      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      return true;
    }
  },

  getTokenExpiryTime: () => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(normalized));
      if (!decoded?.exp) return null;
      return decoded.exp * 1000;
    } catch (error) {
      return null;
    }
  },

  refreshAccessToken: async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok || !data.token) {
        // If refresh token is invalid, clear tokens and stop trying
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          console.log('[authService] Refresh token expired, tokens cleared');
        }
        throw new Error(data.error || 'Failed to refresh session');
      }
      
      const newToken = data.token;
      localStorage.setItem('token', newToken);
      
      // Calculate and store token issue time for proactive refresh
      const tokenIssueTime = Date.now();
      localStorage.setItem('tokenIssueTime', tokenIssueTime.toString());
      
      // Broadcast to other tabs via localStorage
      const syncData = {
        token: newToken,
        timestamp: tokenIssueTime,
        tabId: sessionStorage.getItem('tabId') || Math.random().toString(36)
      };
      localStorage.setItem('tokenSync', JSON.stringify(syncData));
      localStorage.removeItem('tokenSync'); // Remove immediately to trigger storage event
      
      // Dispatch event to notify components in current tab
      window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: { token: newToken } }));
      
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  },

  getTimeUntilExpiry: () => {
    const expiryTime = authService.getTokenExpiryTime();
    if (!expiryTime) return 0;
    return Math.max(0, expiryTime - Date.now());
  },

  shouldProactivelyRefresh: () => {
    const timeUntilExpiry = authService.getTimeUntilExpiry();
    const PROACTIVE_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    return timeUntilExpiry > 0 && timeUntilExpiry <= PROACTIVE_REFRESH_THRESHOLD;
  },

  clearSession: (markExpired = false) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (markExpired) {
      localStorage.setItem('sessionExpired', 'true');
    }
  }
};

export default authService;
