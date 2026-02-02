import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const handleSessionExpired = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.setItem('sessionExpired', 'true');
  window.location.href = '/login';
};

const refreshAccessToken = async () => {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include'
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.token) {
    return null;
  }
  localStorage.setItem('token', data.token);
  return data.token;
};

const buildUrl = (pathOrUrl) => {
  if (!pathOrUrl) {
    return API_URL;
  }
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${API_URL}${path}`;
};

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshPromise = null;
let proactiveRefreshTimer = null;

// Proactive refresh: refresh token before it expires
const scheduleProactiveRefresh = () => {
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer);
  }

  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(normalized));
    
    if (!decoded?.exp) return;
    
    const expiryTime = decoded.exp * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    
    // Schedule refresh 5 minutes before expiry (15min - 5min = 10min from now)
    const PROACTIVE_REFRESH_BUFFER = 5 * 60 * 1000;
    const refreshTime = timeUntilExpiry - PROACTIVE_REFRESH_BUFFER;
    
    if (refreshTime > 0 && refreshTime < 15 * 60 * 1000) {
      console.log(`[apiClient] Proactive refresh scheduled in ${Math.floor(refreshTime / 1000)}s`);
      proactiveRefreshTimer = setTimeout(async () => {
        console.log('[apiClient] Executing proactive refresh');
        try {
          if (!refreshPromise) {
            refreshPromise = axios.post(
              `${API_URL}/auth/refresh`,
              {},
              { withCredentials: true }
            );
          }
          const response = await refreshPromise;
          refreshPromise = null;
          
          if (response.data?.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('tokenIssueTime', Date.now().toString());
            
            // Broadcast to other tabs
            const syncData = {
              token: response.data.token,
              timestamp: Date.now(),
              tabId: sessionStorage.getItem('tabId') || 'unknown'
            };
            localStorage.setItem('tokenSync', JSON.stringify(syncData));
            localStorage.removeItem('tokenSync');
            
            window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: { token: response.data.token } }));
            
            // Schedule next proactive refresh
            scheduleProactiveRefresh();
          }
        } catch (error) {
          refreshPromise = null;
          console.error('[apiClient] Proactive refresh failed:', error);
        }
      }, refreshTime);
    }
  } catch (error) {
    console.error('[apiClient] Error scheduling proactive refresh:', error);
  }
};

// Listen for token updates from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'tokenSync' && e.newValue) {
    try {
      const syncData = JSON.parse(e.newValue);
      const currentTabId = sessionStorage.getItem('tabId');
      
      // Only update if this is a different tab
      if (syncData.tabId !== currentTabId) {
        console.log('[apiClient] Token synced from another tab');
        localStorage.setItem('token', syncData.token);
        localStorage.setItem('tokenIssueTime', syncData.timestamp.toString());
        window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: { token: syncData.token } }));
        scheduleProactiveRefresh();
      }
    } catch (error) {
      console.error('[apiClient] Error syncing token from other tab:', error);
    }
  }
});

// Schedule proactive refresh on initial load
scheduleProactiveRefresh();

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const shouldSkip = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 401 && !shouldSkip) {
      if (!refreshPromise) {
        refreshPromise = axios.post(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
      }

      try {
        const refreshResponse = await refreshPromise;
        refreshPromise = null;
        const newToken = refreshResponse.data?.token;
        if (newToken) {
          localStorage.setItem('token', newToken);
          localStorage.setItem('tokenIssueTime', Date.now().toString());
          
          // Broadcast to other tabs
          const syncData = {
            token: newToken,
            timestamp: Date.now(),
            tabId: sessionStorage.getItem('tabId') || 'unknown'
          };
          localStorage.setItem('tokenSync', JSON.stringify(syncData));
          localStorage.removeItem('tokenSync');
          
          window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: { token: newToken } }));
          
          error.config.headers.Authorization = `Bearer ${newToken}`;
          
          // Reschedule proactive refresh
          scheduleProactiveRefresh();
          
          return apiClient.request(error.config);
        }
      } catch (refreshError) {
        refreshPromise = null;
        handleSessionExpired();
        // Return a rejected promise with a proper error message
        const expiredError = new Error('Session expired. Please log in again.');
        expiredError.response = { data: { error: 'Session expired' } };
        return Promise.reject(expiredError);
      }
    }

    return Promise.reject(error);
  }
);

const authFetch = async (pathOrUrl, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildUrl(pathOrUrl), {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && !String(pathOrUrl).includes('/auth/login')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryHeaders = new Headers(headers);
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      return fetch(buildUrl(pathOrUrl), {
        ...options,
        headers: retryHeaders,
        credentials: 'include',
      });
    }
    handleSessionExpired();
  }

  return response;
};

export { API_URL, authFetch };
export default apiClient;
