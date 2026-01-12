import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const handleSessionExpired = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.setItem('sessionExpired', 'true');
  window.location.href = '/login';
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

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && !url.includes('/auth/login')) {
      handleSessionExpired();
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
  });

  if (response.status === 401 && !String(pathOrUrl).includes('/auth/login')) {
    handleSessionExpired();
  }

  return response;
};

export { API_URL, authFetch };
export default apiClient;
