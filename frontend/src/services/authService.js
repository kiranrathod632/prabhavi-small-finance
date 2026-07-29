import api from './api';

const unwrap = (response) => response.data?.data ?? response.data;

export const setAuthTokens = (accessToken, refreshToken) => {
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  localStorage.removeItem('token');
};

export const clearAuthTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('token');
};

export const getAuthTokens = () => ({
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
});

/** Admin portal — credential accepts email or mobile */
export const adminLogin = async (credential, password) => {
  const response = await api.post('/admin/auth/login', { credential, password });
  return unwrap(response);
};

export const adminRegister = async (payload) => {
  const response = await api.post('/admin/auth/register', payload);
  return unwrap(response);
};

/**
 * Send OTP for verification
 * @param {Object} data - { credential: email or mobile }
 * @returns {Promise}
 */
export const sendOtp = async (data) => {
  try {
    const response = await api.post('/auth/send-otp', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Verify OTP
 * @param {Object} data - { credential: email or mobile, otp: string }
 * @returns {Promise}
 */
export const verifyOtp = async (data) => {
  try {
    const response = await api.post('/auth/verify-otp', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Register a new user
 * @param {Object} data - User registration data
 * @returns {Promise}
 */
export const registerUser = async (data) => {
  try {
    const response = await api.post('/auth/register', data);
    return unwrap(response);
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const registerMobileUser = async (data) => {
  try {
    const response = await api.post('/auth/register-mobile', data);
    return unwrap(response);
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const completeProfileSetup = async (data) => {
  try {
    const response = await api.put('/auth/complete-profile', data);
    return unwrap(response);
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Login user
 * @param {Object} data - { email, password } or { credential, password }
 * @returns {Promise}
 */
export const loginUser = async (data) => {
  try {
    const payload = {
      ...data,
      credential: data.credential || data.email || data.mobile,
    };
    const response = await api.post('/auth/login', payload);
    return unwrap(response);
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Forgot password
 * @param {Object} data - { credential: email or mobile }
 * @returns {Promise}
 */
export const forgotPassword = async (data) => {
  try {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Reset password
 * @param {Object} data - { token, password, confirmPassword }
 * @returns {Promise}
 */
export const resetPassword = async (data) => {
  try {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Change password
 * @param {Object} data - { currentPassword, newPassword, confirmNewPassword }
 * @returns {Promise}
 */
export const changePassword = async (data) => {
  try {
    const response = await api.put('/auth/change-password', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Logout user
 * @returns {Promise}
 */
export const logoutUser = async () => {
  try {
    const response = await api.post('/auth/logout');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

/**
 * Get current user profile
 * @returns {Promise}
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return unwrap(response);
  } catch (error) {
    throw error.response?.data || error;
  }
};