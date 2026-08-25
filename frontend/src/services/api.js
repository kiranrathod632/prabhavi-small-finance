// import axios from 'axios';

// /** Ensure base URL ends with /api (fixes VITE_API_URL set to host without /api). */
// export const resolveApiBaseUrl = () => {
//   const raw = String(import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');
//   if (!raw || raw === '/api') return '/api';
//   if (raw.endsWith('/api')) return raw;
//   return `${raw}/api`;
// };

// const apiBaseUrl = resolveApiBaseUrl();

// const api = axios.create({
//   baseURL: apiBaseUrl,
//   headers: { 'Content-Type': 'application/json' },
// });

// // Request interceptor - attach token; let browser set multipart boundary for FormData
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem('accessToken');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
//     if (config.headers && typeof config.headers.delete === 'function') {
//       config.headers.delete('Content-Type');
//     } else if (config.headers) {
//       delete config.headers['Content-Type'];
//     }
//   }
//   return config;
// });

// // Response interceptor - handle token refresh
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;

//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;
//       const refreshToken = localStorage.getItem('refreshToken');

//       if (refreshToken) {
//         try {
//           const { data } = await axios.post(
//             `${apiBaseUrl}/auth/refresh-token`,
//             { refreshToken }
//           );
//           localStorage.setItem('accessToken', data.data.accessToken);
//           localStorage.setItem('refreshToken', data.data.refreshToken);
//           originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
//           return api(originalRequest);
//         } catch {
//           localStorage.removeItem('accessToken');
//           localStorage.removeItem('refreshToken');
//           window.location.href = '/user/login';
//         }
//       }
//     }

//     return Promise.reject(error);
//   }
// );

// export default api;

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

// Request interceptor - attach token; let browser set multipart boundary for FormData
api.interceptors.request.use((config) => {
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

// ✅ UPDATED: Response interceptor - handle Vercel/Render spin-down AND token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip retry if already retried
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // ============ RENDER/VERCEL SPIN-DOWN HANDLING ============
    // Handle 404, 503, 502, 504 errors that occur when server is waking up
    if (error.response?.status === 404 || 
        error.response?.status === 503 || 
        error.response?.status === 502 ||
        error.response?.status === 504) {
      
      // ✅ Check if error is from Vercel (has Vercel error ID)
      const isVercelError = error.response?.headers?.['x-vercel-error'] || 
                           error.response?.data?.id?.includes('bom1');
      
      // ✅ Check if it's a 404 NOT_FOUND from Vercel
      const isVercelNotFound = error.response?.data?.code === 'NOT_FOUND' &&
                               error.response?.data?.id?.includes('bom1');

      // ✅ Only retry if it's a server wake-up error or Vercel 404
      const shouldRetry = error.response?.status === 503 ||
                         error.response?.status === 502 ||
                         error.response?.status === 504 ||
                         isVercelError ||
                         isVercelNotFound;

      if (shouldRetry) {
        // Initialize retry counter if not exists
        originalRequest._renderRetryCount = originalRequest._renderRetryCount || 0;
        
        // Maximum 3 retry attempts
        if (originalRequest._renderRetryCount < 3) {
          originalRequest._renderRetryCount++;
          console.log(`🔄 Retry ${originalRequest._renderRetryCount}/3 for ${originalRequest.url}`);
          
          // Wait before retry (increasing wait time)
          const waitTime = originalRequest._renderRetryCount * 3000; // 3s, 6s, 9s
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Retry the same request
          return api(originalRequest);
        } else {
          console.error(`❌ Server wake-up failed after 3 retries for ${originalRequest.url}`);
          // ✅ Don't reject, return a friendly error
          const enhancedError = {
            ...error,
            isServerWakeUpError: true,
            message: 'Server is waking up. Please try again in a moment.'
          };
          return Promise.reject(enhancedError);
        }
      }
    }

    // ============ TOKEN REFRESH HANDLING ============
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${apiBaseUrl}/auth/refresh-token`,
            { refreshToken }
          );
          
          // ✅ Handle both token types (accessToken or token)
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
        } catch (refreshError) {
          // ✅ Clear tokens and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      } else {
        // ✅ No refresh token, redirect to login
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