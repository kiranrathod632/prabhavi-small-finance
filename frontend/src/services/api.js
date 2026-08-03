import axios from 'axios';

/** Ensure base URL ends with /api (fixes VITE_API_URL set to host without /api). */
export const resolveApiBaseUrl = () => {
  const raw = String(import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');
  if (!raw || raw === '/api') return '/api';
  if (raw.endsWith('/api')) return raw;
  return `${raw}/api`;
};

const apiBaseUrl = resolveApiBaseUrl();

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${apiBaseUrl}/auth/refresh-token`,
            { refreshToken }
          );
          localStorage.setItem('accessToken', data.data.accessToken);
          localStorage.setItem('refreshToken', data.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/user/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
