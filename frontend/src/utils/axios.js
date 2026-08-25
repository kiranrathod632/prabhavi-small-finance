// src/utils/axios.js
import axios from 'axios';

/** Ensure base URL ends with /api (fixes VITE_API_URL set to host without /api). */
export const resolveApiBaseUrl = () => {
  const raw = String(import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');
  if (!raw || raw === '/api') return '/api';
  if (raw.endsWith('/api')) return raw;
  return `${raw}/api`;
};

const apiBaseUrl = resolveApiBaseUrl();
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: API_TIMEOUT,
});

// ✅ Request interceptor - SUPPORTS BOTH TOKEN TYPES
api.interceptors.request.use((config) => {
  // ✅ Support both 'accessToken' and 'token'
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers && typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    } else if (config.headers) {
      delete config.headers['Content-Type'];
    }
  }
  return config;
});

// ✅ Response interceptor - HANDLES VERCELL + RENDER + TOKEN REFRESH
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip retry if already retried
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // ============ HANDLE VERCELL / RENDER SPIN-DOWN ============
    const isVercelError = error.response?.status === 404 && 
                          error.response?.data?.code === 'NOT_FOUND' &&
                          error.response?.data?.id?.includes('bom1');

    const isServerWakeUp = error.response?.status === 503 || 
                          error.response?.status === 502 || 
                          error.response?.status === 504;

    if (isServerWakeUp || isVercelError) {
      originalRequest._renderRetryCount = originalRequest._renderRetryCount || 0;
      
      if (originalRequest._renderRetryCount < 3) {
        originalRequest._renderRetryCount++;
        console.log(`🔄 Retry ${originalRequest._renderRetryCount}/3 for ${originalRequest.url}`);
        
        const waitTime = originalRequest._renderRetryCount * 3000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return api(originalRequest);
      } else {
        console.error(`❌ Server wake-up failed after 3 retries for ${originalRequest.url}`);
        const enhancedError = {
          ...error,
          isServerWakeUpError: true,
          message: 'Server is waking up. Please try again.'
        };
        return Promise.reject(enhancedError);
      }
    }

    // ============ TOKEN REFRESH (UNCHANGED LOGIC) ============
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${apiBaseUrl}/auth/refresh-token`,
            { refreshToken }
          );
          
          // ✅ Support both response formats
          const newAccessToken = data.data?.accessToken || data.data?.token;
          const newRefreshToken = data.data?.refreshToken || data.data?.token;
          
          if (newAccessToken) {
            localStorage.setItem('accessToken', newAccessToken);
            localStorage.setItem('token', newAccessToken);
          }
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch {
          // ✅ Clear ALL tokens and redirect
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } else {
        // ✅ No refresh token - redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;