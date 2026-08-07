import api from './api';

export { default as adminPanelAPI } from './adminPanelAPI';
export { default as adminApi } from './adminApi';

// OTP
export const otpAPI = {
  send: (data) => api.post('/otp/send', data),
  verify: (data) => api.post('/otp/verify', data),
  resend: (data) => api.post('/otp/resend', data),
};

// Auth extensions
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  loginMobile: (data) => api.post('/auth/login-mobile', data),
  sendLoginOtp: (data) => api.post('/auth/send-login-otp', data),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (credential) => api.post('/auth/forgot-password', { credential }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  resetPasswordWithOtp: (data) => api.post('/auth/reset-password-otp', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  getMe: () => api.get('/auth/me'),
};

// KYC
export const kycAPI = {
  submit: (data) => api.post('/kyc/submit', data),
  getStatus: () => api.get('/kyc/status'),
  getPending: (params) => api.get('/kyc/pending', { params }),
  review: (userId, data) => api.put(`/kyc/${userId}/review`, data),
};

// Settings
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  calculateEmi: (data) => api.post('/settings/calculate-emi', data),
};

// Recovery
export const recoveryAPI = {
  getDashboard: () => api.get('/recovery/dashboard'),
  getCases: (params) => api.get('/recovery/cases', { params }),
  createCase: (data) => api.post('/recovery/cases', data),
  updateCase: (id, data) => api.put(`/recovery/cases/${id}`, data),
  addNote: (id, data) => api.post(`/recovery/cases/${id}/notes`, data),
  getNotes: (id) => api.get(`/recovery/cases/${id}/notes`),
  logCall: (data) => api.post('/recovery/calls', data),
  getCalls: (params) => api.get('/recovery/calls', { params }),
  logVisit: (data) => api.post('/recovery/visits', data),
  getVisits: (params) => api.get('/recovery/visits', { params }),
};

// Reports
export const reportAPI = {
  get: (type, params) => api.get(`/reports/${type}`, { params }),
  exportExcel: (type, params) => api.get(`/reports/${type}`, { params: { ...params, format: 'excel' }, responseType: 'blob' }),
  exportCsv: (type, params) => api.get(`/reports/${type}`, { params: { ...params, format: 'csv' }, responseType: 'blob' }),
};

// Admin management (Super Admin)
export const adminAPI = {
  getAll: (params) => api.get('/admins', { params }),
  create: (data) => api.post('/admins', data),
  update: (id, data) => api.put(`/admins/${id}`, data),
  delete: (id) => api.delete(`/admins/${id}`),
  activate: (id) => api.put(`/admins/${id}/activate`),
  deactivate: (id) => api.put(`/admins/${id}/deactivate`),
  resetPassword: (id, password) => api.put(`/admins/${id}/reset-password`, { password }),
  assignUser: (userId, adminId) => api.put(`/admins/users/${userId}/assign`, { adminId }),
  getStats: (id) => api.get(`/admins/${id}/stats`),
};

// Users
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  exportExcel: () => api.get('/users/export/excel', { responseType: 'blob' }),
};

// Profile
export const profileAPI = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  uploadAvatar: (formData) => api.post('/profile/avatar', formData),
  uploadDocument: (formData) => api.post('/profile/documents', formData),
};

// Loans
export const loanAPI = {
  getAll: (params) => api.get('/loans', { params }),
  getById: (id) => api.get(`/loans/${id}`),
  create: (data) => api.post('/loans', data),
  update: (id, data) => api.put(`/loans/${id}`, data),
  delete: (id) => api.delete(`/loans/${id}`),
  selectTenure: (id, tenure) => api.post(`/loans/${id}/select-tenure`, { tenure }),
  calculate: (data) => api.post('/loans/calculate', data),
  downloadStatement: (id) => api.get(`/loans/${id}/statement`, { responseType: 'blob' }),
  exportExcel: () => api.get('/loans/export/excel', { responseType: 'blob' }),
};

// EMIs
export const emiAPI = {
  getAll: (params) => api.get('/emis', { params }),
  getById: (id) => api.get(`/emis/${id}`),
  pay: (data) => api.post('/emis/pay', data),
  update: (id, data) => api.put(`/emis/${id}`, data),
  downloadReceipt: (id) => api.get(`/emis/${id}/receipt`, { responseType: 'blob' }),
};

// Transactions
export const transactionAPI = {
  getAll: (params = {}) => {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    );
    return api.get('/transactions', { params: clean });
  },
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  downloadStatement: (params = {}) => {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    );
    return api.get('/transactions/statement/pdf', { params: clean, responseType: 'blob' });
  },
  exportExcel: (params = {}) => {
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    );
    return api.get('/transactions/export/excel', { params: clean, responseType: 'blob' });
  },
};

// Funds
export const fundAPI = {
  get: () => api.get('/funds'),
  update: (data) => api.post('/funds', data),
};

// Notifications
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Dashboard
export const dashboardAPI = {
  getAdmin: () => api.get('/dashboard/admin'),
  getRecovery: () => api.get('/dashboard/recovery'),
  getUser: () => api.get('/dashboard/user'),
  getReport: (type, params) => api.get(`/dashboard/reports/${type}`, { params }),
};
