// src/utils/axios.js
import axios from "axios";
import { API_BASE_URL } from "../config/config";

// Create Axios instance
const API = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 120000 // 120 seconds
});

// ✅ Request interceptor - Add token to headers
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");
        
        // ✅ Support both token keys
        const finalToken = token || localStorage.getItem("accessToken");
        
        if (finalToken) {
            config.headers.Authorization = `Bearer ${finalToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ✅ Response interceptor - Handle 401 and Vercel errors
API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // ============ VERCELL 404 HANDLING ============
        const isVercel404 = error.response?.status === 404 && 
                            error.response?.data?.code === 'NOT_FOUND' &&
                            error.response?.data?.id?.includes('bom1');

        const isServerWakeUp = error.response?.status === 503 || 
                              error.response?.status === 502 || 
                              error.response?.status === 504;

        // ✅ Retry Vercel errors (3 times)
        if ((isVercel404 || isServerWakeUp) && !originalRequest._retry) {
            originalRequest._retry = true;
            originalRequest._renderRetryCount = originalRequest._renderRetryCount || 0;
            
            if (originalRequest._renderRetryCount < 3) {
                originalRequest._renderRetryCount++;
                console.log(`🔄 Retry ${originalRequest._renderRetryCount}/3 for ${originalRequest.url}`);
                
                const waitTime = originalRequest._renderRetryCount * 3000;
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return API(originalRequest);
            }
        }

        // ============ 401 UNAUTHORIZED HANDLING ============
        if (error.response && error.response.status === 401) {
            console.error("Unauthorized! Redirecting to login...");
            try {
                localStorage.removeItem("token");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("userId");
                localStorage.removeItem("username");
                localStorage.removeItem("profile_pic");
                localStorage.removeItem("last_name");
                localStorage.removeItem("first_name");
                localStorage.removeItem("login_timestamp");
                localStorage.removeItem("role");
                localStorage.removeItem("lastKnownProfilePercentage");
                localStorage.removeItem("profileCompletionIndicatorClosed");
                localStorage.removeItem("selectedProfile");
            } catch (_) {}
            
            // ✅ Redirect to login
            if (typeof window !== 'undefined') {
                window.location.href = "/login";
            }
        }
        
        return Promise.reject(error);
    }
);

export default API;