import { body, param, query } from 'express-validator';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidMobile = (value) => /^[6-9]\d{9}$/.test(value);
const isValidCredential = (value) => isValidEmail(value) || isValidMobile(value);

export const registerValidator = [
  body('name').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('firstName').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
  body('middleName').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
  body('lastName').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
  body().custom((_, { req }) => {
    const fullName = [req.body.firstName, req.body.middleName, req.body.lastName]
      .map((part) => (part || '').trim())
      .filter(Boolean)
      .join(' ');
    if (!fullName && !(req.body.name || '').trim()) {
      throw new Error('First name and last name are required');
    }
    if (!fullName && (req.body.name || '').trim()) return true;
    if (!req.body.firstName?.trim() || !req.body.lastName?.trim()) {
      throw new Error('First name and last name are required');
    }
    return true;
  }),

  // Updated credential validator - accepts both email and mobile
  body('credential')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (!value) return true;
      if (!isValidCredential(value)) {
        throw new Error('Please enter a valid email or 10-digit mobile number');
      }
      return true;
    })
    .customSanitizer((value) => {
      if (!value) return value;
      // If it's an email, normalize it
      if (isValidEmail(value)) {
        return value.toLowerCase().trim();
      }
      // If it's mobile, just trim
      return value.trim();
    }),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),

  // Keep phone for backward compatibility
  body('phone')
    .optional({ values: 'falsy' })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit phone required'),

  // Keep email for backward compatibility
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),

  // Keep mobile for backward compatibility
  body('mobile')
    .optional({ values: 'falsy' })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit mobile required'),

  body('adminId')
    .notEmpty()
    .withMessage('Please select an Admin')
    .isMongoId()
    .withMessage('Invalid Admin selected'),

  // Custom validator to ensure at least one credential is provided
  body().custom((value, { req }) => {
    const { credential, email, mobile } = req.body;
    const hasCredential = credential && credential.trim().length > 0;
    const hasEmail = email && email.trim().length > 0;
    const hasMobile = mobile && mobile.trim().length > 0;

    if (!hasCredential && !hasEmail && !hasMobile) {
      throw new Error('At least one credential (email or mobile) is required');
    }
    return true;
  }),
];

export const mobileRegisterValidator = [
  body('mobile')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit mobile required'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 4, max: 8 })
    .withMessage('Invalid OTP'),
];

export const completeProfileValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 50 }),
  body('middleName').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
  body('adminId')
    .notEmpty()
    .withMessage('Please select an Admin')
    .isMongoId()
    .withMessage('Invalid Admin selected'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
];


export const loginValidator = [
  // Primary field: credential (accepts both email and mobile)
  body('credential')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (!value) return true; // Skip if not provided (handled by custom validator below)
      if (!isValidCredential(value)) {
        throw new Error('Please enter a valid email or 10-digit mobile number');
      }
      return true;
    })
    .customSanitizer((value) => {
      if (!value) return value;
      // If it's an email, normalize it
      if (isValidEmail(value)) {
        return value.toLowerCase().trim();
      }
      // If it's mobile, just trim
      return value.trim();
    }),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  // Backward compatibility: email field (optional)
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),

  // Backward compatibility: mobile field (optional)
  body('mobile')
    .optional({ values: 'falsy' })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit mobile required'),

  // Custom validator to ensure at least one credential is provided
  body().custom((value, { req }) => {
    const { credential, email, mobile } = req.body;
    const hasCredential = credential && credential.trim().length > 0;
    const hasEmail = email && email.trim().length > 0;
    const hasMobile = mobile && mobile.trim().length > 0;

    if (!hasCredential && !hasEmail && !hasMobile) {
      throw new Error('Email or mobile number is required');
    }
    return true;
  }),
];


export const adminRegisterValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),

  body('credential')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (!value) return true;
      if (!isValidCredential(value)) {
        throw new Error('Please enter a valid email or 10-digit mobile number');
      }
      return true;
    })
    .customSanitizer((value) => {
      if (!value) return value;
      if (isValidEmail(value)) return value.toLowerCase().trim();
      return value.trim();
    }),

  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),

  body('mobile')
    .optional({ values: 'falsy' })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit mobile required'),

  body('registrationKey').optional({ values: 'falsy' }).trim(),

  body().custom((_value, { req }) => {
    const { credential, email, mobile } = req.body;
    const hasCredential = credential && String(credential).trim().length > 0;
    const hasEmail = email && String(email).trim().length > 0;
    const hasMobile = mobile && String(mobile).trim().length > 0;

    if (!hasCredential && !hasEmail && !hasMobile) {
      throw new Error('Email or mobile number is required');
    }
    return true;
  }),
];

export const forgotPasswordValidator = [
  // Updated to accept both email and mobile
  body('credential')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (!value) return true;
      if (!isValidCredential(value)) {
        throw new Error('Please enter a valid email or 10-digit mobile number');
      }
      return true;
    })
    .customSanitizer((value) => {
      if (!value) return value;
      if (isValidEmail(value)) {
        return value.toLowerCase().trim();
      }
      return value.trim();
    }),

  // Keep email for backward compatibility
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),

  // Keep mobile for backward compatibility
  body('mobile')
    .optional({ values: 'falsy' })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit mobile required'),

  // Custom validator to ensure at least one credential is provided
  body().custom((value, { req }) => {
    const { credential, email, mobile } = req.body;
    const hasCredential = credential && credential.trim().length > 0;
    const hasEmail = email && email.trim().length > 0;
    const hasMobile = mobile && mobile.trim().length > 0;

    if (!hasCredential && !hasEmail && !hasMobile) {
      throw new Error('Email or mobile number is required');
    }
    return true;
  }),
];

export const resetPasswordValidator = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
];

export const resetPasswordOtpValidator = [
  body('mobile')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit mobile required'),
  body('credential')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit mobile required'),
  body('otp')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 4, max: 8 })
    .withMessage('Invalid OTP'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body().custom((_, { req }) => {
    if (!req.body.mobile && !req.body.credential) {
      throw new Error('Mobile number is required');
    }
    return true;
  }),
];

export const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
];

// User validators
export const updateUserValidator = [
  body('name').optional().trim().isLength({ max: 100 }),

  // Updated email validator
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),

  // Add mobile support for update
  body('mobile')
    .optional({ values: 'falsy' })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit mobile required'),

  // Add credential support for update
  body('credential')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (!value) return true;
      if (!isValidCredential(value)) {
        throw new Error('Please enter a valid email or 10-digit mobile number');
      }
      return true;
    })
    .customSanitizer((value) => {
      if (!value) return value;
      if (isValidEmail(value)) {
        return value.toLowerCase().trim();
      }
      return value.trim();
    }),

  body('role').optional().isIn(['super_admin', 'admin', 'recovery_agent', 'user']),
  body('isActive').optional().isBoolean(),
  body('isSuspended').optional().isBoolean(),
];

export const createUserValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),

  // Primary credential field
  body('credential')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (!value) return true;
      if (!isValidCredential(value)) {
        throw new Error('Please enter a valid email or 10-digit mobile number');
      }
      return true;
    })
    .customSanitizer((value) => {
      if (!value) return value;
      if (isValidEmail(value)) {
        return value.toLowerCase().trim();
      }
      return value.trim();
    }),

  // Backward compatibility fields
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),

  body('mobile')
    .optional({ values: 'falsy' })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit mobile required'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  body('role').optional().isIn(['super_admin', 'admin', 'recovery_agent', 'user']),

  body('adminId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('Invalid Admin selected'),

  // Custom validator to ensure at least one credential is provided
  body().custom((value, { req }) => {
    const { credential, email, mobile } = req.body;
    const hasCredential = credential && credential.trim().length > 0;
    const hasEmail = email && email.trim().length > 0;
    const hasMobile = mobile && mobile.trim().length > 0;

    if (!hasCredential && !hasEmail && !hasMobile) {
      throw new Error('At least one credential (email or mobile) is required');
    }
    return true;
  }),
];

// Profile validators
export const updateProfileValidator = [
  body('name').optional().trim().isLength({ max: 100 }),
  body('firstName').optional().trim().isLength({ max: 50 }),
  body('middleName').optional().trim().isLength({ max: 50 }),
  body('lastName').optional().trim().isLength({ max: 50 }),
  body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit phone required'),
  body('pan').optional().matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('Valid PAN required'),
  body('aadhaar').optional().matches(/^\d{12}$/).withMessage('Valid 12-digit Aadhaar required'),
  body('ifscCode').optional().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Valid IFSC required'),
  body('pincode').optional().matches(/^\d{6}$/).withMessage('Valid 6-digit pincode required'),
];

// Loan validators
export const createLoanValidator = [
  body('loanType').isIn(['personal', 'home', 'business', 'education', 'vehicle']).withMessage('Invalid loan type'),
  body('amount').isFloat({ min: 1000 }).withMessage('Minimum loan amount is ₹1,000'),
  body('tenure').optional().isInt({ min: 1, max: 360 }),
  // body('purpose').trim().notEmpty().withMessage('Loan purpose is required'),
];

export const updateLoanValidator = [
  body('status').optional().isIn([
    'pending', 'under_review', 'approved', 'rejected', 'disbursed', 'active', 'closed', 'defaulted', 'cancelled',
  ]),
  body('interestRate').optional().isFloat({ min: 0, max: 50 }),
  body('processingFee').optional().isFloat({ min: 0 }),
  body('gstAmount').optional().isFloat({ min: 0 }),
  body('rejectedReason').optional().trim(),
  body('remarks').optional().trim(),
];

// EMI validators
export const payEMIValidator = [
  body('emiId').notEmpty().withMessage('EMI ID is required'),
  body('paymentMethod').optional().isIn(['wallet', 'bank_transfer', 'upi', 'cash', 'cheque', 'online']),
];

// Transaction validators
export const createTransactionValidator = [
  body('type').isIn(['credit', 'debit', 'emi_payment', 'loan_disbursement', 'penalty', 'refund']),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('description').optional().trim(),
];

// Fund validators
export const updateFundValidator = [
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('type').isIn(['deposit', 'withdrawal', 'expense']).withMessage('Invalid fund operation type'),
  body('description').optional().trim(),
];

// Common validators
export const mongoIdValidator = [
  param('id').isMongoId().withMessage('Invalid ID format'),
];

export const paginationValidator = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().trim(),
  query('search').optional().trim(),
];

export const dateFilterValidator = [
  query('filter')
    .optional({ values: 'falsy' })
    .isIn(['today', 'week', 'month', 'custom']),
  query('startDate').optional({ values: 'falsy' }).isISO8601(),
  query('endDate').optional({ values: 'falsy' }).isISO8601(),
];

// Export helper functions for use in controllers
export const helpers = {
  isValidEmail,
  isValidMobile,
  isValidCredential,
  getCredentialType: (value) => {
    if (!value) return 'unknown';
    if (isValidEmail(value)) return 'email';
    if (isValidMobile(value)) return 'mobile';
    return 'unknown';
  }
};