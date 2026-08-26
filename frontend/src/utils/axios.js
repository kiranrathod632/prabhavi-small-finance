// src/utils/axios.js

import axios from "axios";
import { API_BASE_URL } from "../config/config";

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 120000,
});

/* ============================================
   REQUEST INTERCEPTOR
============================================ */

API.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");

    if (token) {
      config.headers = config.headers || {};

      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


/* ============================================
   RESPONSE INTERCEPTOR
============================================ */

API.interceptors.response.use(
  (response) => {
    return response;
  },

  async (error) => {
    const originalRequest = error.config;

    /* ==========================================
       401 UNAUTHORIZED
    ========================================== */

    if (error.response?.status === 401) {

      console.error(
        "Unauthorized:",
        originalRequest?.url
      );

      // Token ko yaha remove mat karo automatically.
      // Agar backend ne token invalid bola tab login page par bhejo.

      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/user/login"
      ) {
        window.location.href = "/user/login";
      }
    }

    return Promise.reject(error);
  }
);

export default API;