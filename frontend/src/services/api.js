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
  const token = localStorage.getItem('accessToken');
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

// ⭐ NEW: Response interceptor - handle Render spin-down AND token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ============ RENDER SPIN-DOWN HANDLING (NEW) ============
    // Handle 404, 503, 502 errors that occur when Render server is waking up
    if (error.response?.status === 404 || 
        error.response?.status === 503 || 
        error.response?.status === 502) {
      
      // Initialize retry counter if not exists
      originalRequest._renderRetryCount = originalRequest._renderRetryCount || 0;
      
      // Maximum 3 retry attempts
      if (originalRequest._renderRetryCount < 3) {
        originalRequest._renderRetryCount++;
        console.log(`🔄 Render wake-up retry ${originalRequest._renderRetryCount}/3 for ${originalRequest.url}`);
        
        // Wait before retry (increasing wait time)
        const waitTime = originalRequest._renderRetryCount * 4000; // 4s, 8s, 12s
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Retry the same request
        return api(originalRequest);
      } else {
        console.error(`❌ Render server wake-up failed after 3 retries for ${originalRequest.url}`);
        // Return a user-friendly error without breaking existing functionality
        const enhancedError = {
          ...error,
          isRenderWakeUpError: true,
          message: 'Server is waking up. Please try again in a moment.'
        };
        return Promise.reject(enhancedError);
      }
    }

    // ============ TOKEN REFRESH HANDLING (EXISTING - UNCHANGED) ============
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