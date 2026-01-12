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
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return apiClient.request(error.config);
        }
      } catch (refreshError) {
        refreshPromise = null;
        handleSessionExpired();
        return Promise.reject(refreshError);
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
