import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // UC-02 Alternate Flow: Session expired
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login with message
      window.location.href = '/login?expired=true';
    }
    return Promise.reject(error);
  }
);

// Authentication service
const authService = {
  // login(email, password) - corresponds to UI -> C: login(email, password)
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
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
      await api.post('/auth/logout');
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
  }
};

export default authService;
