import i18n from '../i18n';

/**
 * Format amount as Indian Rupees
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

/**
 * Format date
 */
export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';
  const lang = i18n.language?.startsWith('hi') ? 'hi-IN' : i18n.language?.startsWith('mr') ? 'mr-IN' : 'en-IN';
  return new Date(date).toLocaleDateString(lang, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  });
};

/**
 * Format datetime
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Download blob as file
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Get status badge color classes
 */
export const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    disbursed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    defaulted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Get transaction type label (i18n-aware — Marathi/Hindi/English)
 */
export const getTransactionTypeLabel = (type) => {
  if (!type) return '-';
  const normalized = String(type).toLowerCase().replace(/\s+/g, '_');
  const key = `txnType.${normalized}`;
  if (i18n.exists(key)) return i18n.t(key);
  return i18n.t(key, { defaultValue: String(type).replace(/_/g, ' ') });
};

/**
 * Status label (completed, pending, etc.)
 */
export const getStatusLabel = (status) => {
  if (!status) return '-';
  const key = `statusLabel.${status}`;
  if (i18n.exists(key)) return i18n.t(key);
  return i18n.t(key, { defaultValue: status });
};

/**
 * Loan type options
 */
export const loanTypes = [
  { value: 'personal', label: 'Personal Loan' },
  { value: 'home', label: 'Home Loan' },
  { value: 'business', label: 'Business Loan' },
  { value: 'education', label: 'Education Loan' },
  { value: 'vehicle', label: 'Vehicle Loan' },
];

/**
 * Extract error message from API error
 */
export const getErrorMessage = (error) => {
  const payload = error?.response?.data || error;
  if (payload?.errors?.length) {
    return payload.errors.map((e) => e.message).join(', ');
  }
  return payload?.message || error?.message || 'Something went wrong';
};
