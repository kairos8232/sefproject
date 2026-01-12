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
        throw new Error(data.error || 'Failed to refresh session');
      }
      localStorage.setItem('token', data.token);
      
      // Dispatch event to notify components that token was updated
      window.dispatchEvent(new Event('tokenUpdated'));
      
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
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
