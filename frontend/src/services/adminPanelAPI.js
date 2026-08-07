import adminApi from './adminApi';

/**
 * Dedicated Admin Panel API — all calls go to /api/admin/*
 */
export const adminPanelAPI = {
  // Auth
  login: (email, password) => adminApi.post('/auth/login', { email, password }),
  logout: () => adminApi.post('/auth/logout'),
  getMe: () => adminApi.get('/auth/me'),

  // Dashboard
  getDashboard: () => adminApi.get('/dashboard'),

  // Users — admin creates users
  getUsers: (params) => adminApi.get('/users', { params }),
  getUser: (id) => adminApi.get(`/users/${id}`),
  createUser: (data) => adminApi.post('/users', data),
  updateUser: (id, data) => adminApi.put(`/users/${id}`, data),
  deleteUser: (id) => adminApi.delete(`/users/${id}`),
  exportUsers: () => adminApi.get('/users/export/excel', { responseType: 'blob' }),

  // Loans
  getLoans: (params) => adminApi.get('/loans', { params }),
  getLoan: (id) => adminApi.get(`/loans/${id}`),
  updateLoan: (id, data) => adminApi.put(`/loans/${id}`, data),
  exportLoans: () => adminApi.get('/loans/export/excel', { responseType: 'blob' }),

  // EMIs — collect payments
  getEMIs: (params) => adminApi.get('/emis', { params }),
  getEMI: (id) => adminApi.get(`/emis/${id}`),
  updateEMI: (id, data) => adminApi.put(`/emis/${id}`, data),
  collectEMI: (id, data) => adminApi.post(`/emis/${id}/collect`, data),
  partialPayEMI: (id, data) => adminApi.post(`/emis/${id}/partial-pay`, data),
  addPenalty: (id, data) => adminApi.put(`/emis/${id}/penalty`, data),
  downloadReceipt: (id) => adminApi.get(`/emis/${id}/receipt`, { responseType: 'blob' }),

  // Super Admin — manage admins
  getAdmins: (params) => adminApi.get('/manage/admins', { params }),
  sendAdminInviteOtp: (data) => adminApi.post('/manage/admins/send-otp', data),
  verifyAdminInviteOtp: (data) => adminApi.post('/manage/admins/verify-otp', data),
  createAdmin: (data) => adminApi.post('/manage/admins', data),
  updateAdmin: (id, data) => adminApi.put(`/manage/admins/${id}`, data),
  deleteAdmin: (id) => adminApi.delete(`/manage/admins/${id}`),
  activateAdmin: (id) => adminApi.put(`/manage/admins/${id}/activate`),
  deactivateAdmin: (id) => adminApi.put(`/manage/admins/${id}/deactivate`),
  resetAdminPassword: (id, password) => adminApi.put(`/manage/admins/${id}/reset-password`, { password }),
  assignUser: (userId, adminId) => adminApi.put(`/manage/users/${userId}/assign`, { adminId }),

  // Funds
  getFunds: () => adminApi.get('/funds'),
  updateFund: (data) => adminApi.post('/funds', data),

  // Purchases / expenses (approve → fund deduct)
  getPurchases: (params) => adminApi.get('/purchases', { params }),
  getPurchaseSummary: () => adminApi.get('/purchases/summary'),
  createPurchase: (formData) => adminApi.post('/purchases', formData),
  approvePurchase: (id, data) => adminApi.put(`/purchases/${id}/approve`, data || {}),
  rejectPurchase: (id, data) => adminApi.put(`/purchases/${id}/reject`, data || {}),

  // Commission
  getCommissions: (params) => adminApi.get('/commissions', { params }),
  updateCommissionRate: (data) => adminApi.put('/commission-rate', data),

  // Notifications
  getNotifications: (params) => adminApi.get('/notifications', { params }),
  markAsRead: (id) => adminApi.put(`/notifications/${id}/read`),
  markAllAsRead: () => adminApi.put('/notifications/read-all'),
};

export default adminPanelAPI;
