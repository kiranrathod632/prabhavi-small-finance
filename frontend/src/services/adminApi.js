import axios from 'axios';
import { resolveApiBaseUrl } from './api.js';

const apiBaseUrl = resolveApiBaseUrl();

const adminApi = axios.create({
  baseURL: `${apiBaseUrl}/admin`,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
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
          return adminApi(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/admin/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default adminApi;
