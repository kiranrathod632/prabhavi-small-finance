// services/smsService.js

import twilio from 'twilio';
import Otp from '../models/Otp.js';
import Notification from '../models/Notification.js';

const getTwilioConfig = () => ({
  accountSid: (process.env.TWILIO_ACCOUNT_SID || '').trim(),
  authToken: (process.env.TWILIO_AUTH_TOKEN || '').trim(),
  phoneNumber: (process.env.TWILIO_PHONE_NUMBER || '').replace(/\s+/g, '').trim(),
  messagingServiceSid: (process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim(),
});

const getFast2SmsConfig = () => ({
  apiKey: (process.env.SMS_API_KEY || process.env.FAST2SMS_API_KEY || '').trim(),
  apiUrl: (process.env.SMS_API_URL || 'https://www.fast2sms.com/dev/bulkV2').trim(),
});

const isPlaceholder = (value = '') =>
  !value ||
  /^your[_-]/i.test(value) ||
  /xxx|replace|changeme|example/i.test(value);

const getTwilioClient = () => {
  const { accountSid, authToken } = getTwilioConfig();
  return twilio(accountSid, authToken);
};

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const SMS_RATE_LIMIT = {
  perMinute: 3,
  perDay: 20
};

/**
 * Send SMS via Fast2SMS (preferred for India)
 */
const sendViaFast2Sms = async ({ mobile, message }) => {
  const { apiKey, apiUrl } = getFast2SmsConfig();

  if (isPlaceholder(apiKey)) {
    return { success: false, error: 'Fast2SMS API key is missing or still a placeholder' };
  }

  const url = new URL(apiUrl);
  url.searchParams.set('authorization', apiKey);
  url.searchParams.set('route', 'q');
  url.searchParams.set('message', message);
  url.searchParams.set('language', 'english');
  url.searchParams.set('flash', '0');
  url.searchParams.set('numbers', mobile);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      authorization: apiKey,
      'cache-control': 'no-cache',
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.return === false) {
    return {
      success: false,
      error: data.message || data.error || `Fast2SMS failed (${response.status})`,
      provider: 'fast2sms',
    };
  }

  console.log(`[SMS] Fast2SMS sent to ${mobile}`, data.request_id || data.message || '');
  return {
    success: true,
    messageId: data.request_id || `fast2sms_${Date.now()}`,
    provider: 'fast2sms',
    status: 'sent',
  };
};

/**
 * Send SMS via Twilio
 */
const sendViaTwilio = async ({ mobile, message }) => {
  const formattedNumber = `+91${mobile}`;
  const { accountSid, authToken, phoneNumber, messagingServiceSid } = getTwilioConfig();

  if (
    isPlaceholder(accountSid) ||
    isPlaceholder(authToken) ||
    (!messagingServiceSid && !phoneNumber)
  ) {
    return { success: false, error: 'Twilio credentials are missing or invalid' };
  }

  const messageOptions = {
    body: message,
    to: formattedNumber,
  };

  if (messagingServiceSid) {
    messageOptions.messagingServiceSid = messagingServiceSid;
  } else {
    messageOptions.from = phoneNumber;
  }

  console.log(`[SMS] Sending Twilio SMS to ${formattedNumber}`);
  const response = await getTwilioClient().messages.create(messageOptions);
  console.log(`[SMS] Twilio message sent: ${response.sid}`);

  return {
    success: true,
    messageId: response.sid,
    status: response.status,
    provider: 'twilio',
  };
};

/**
 * Send SMS — Fast2SMS first (India), then Twilio fallback
 */
export const sendSms = async ({ to, message }) => {
  try {
    const mobile = String(to || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return { success: false, error: 'Invalid phone number' };
    }

    // Prefer Fast2SMS for Indian numbers when configured
    const fastResult = await sendViaFast2Sms({ mobile, message });
    if (fastResult.success) {
      return fastResult;
    }

    console.warn(`[SMS] Fast2SMS skipped/failed: ${fastResult.error}`);

    try {
      return await sendViaTwilio({ mobile, message });
    } catch (error) {
      console.error('SMS send error:', error.message);
      console.error('Twilio error details:', error.code, error.moreInfo);

      if (error.code === 21211) {
        return { success: false, error: 'Invalid phone number' };
      }
      if (error.code === 21608) {
        return { success: false, error: 'Unauthorized phone number' };
      }
      if (error.code === 21614) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // Surface the root cause clearly when both providers fail
      if (error.message === 'Authenticate' || error.code === 20003) {
        return {
          success: false,
          error:
            'SMS provider auth failed. Set a real SMS_API_KEY (Fast2SMS) or valid TWILIO_AUTH_TOKEN in backend/.env, then restart server.',
        };
      }

      return { success: false, error: error.message };
    }
  } catch (error) {
    console.error('SMS send error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Alias matching Enlaz-style helper
 */
export const sendSMS = async ({ to, message }) => {
  const result = await sendSms({ to, message });
  if (!result.success) {
    throw new Error(result.error || 'Error sending SMS');
  }
  return result;
};

/**
 * Send SMS with template (for DLT compliance)
 */
export const sendTemplateSms = async ({ to, templateId, parameters }) => {
  try {
    const mobile = String(to || '').replace(/\D/g, '').slice(-10);
    const formattedNumber = `+91${mobile}`;
    const { messagingServiceSid } = getTwilioConfig();

    if (!messagingServiceSid) {
      console.log(`[SMS] Template: ${templateId} | To: ${formattedNumber} | Params:`, parameters);
      return { success: true, mode: 'simulation' };
    }

    const response = await getTwilioClient().messages.create({
      messagingServiceSid,
      to: formattedNumber,
      contentSid: templateId,
      contentVariables: JSON.stringify(parameters),
    });

    return { success: true, messageId: response.sid };
  } catch (error) {
    console.error('Template SMS error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send bulk SMS using Twilio
 */
export const sendBulkSms = async ({ recipients, message }) => {
  try {
    const results = [];

    for (const to of recipients) {
      const result = await sendSms({ to, message });
      results.push({ to, ...result });
    }

    return { success: true, results };
  } catch (error) {
    console.error('Bulk SMS error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send OTP SMS
 */
export const sendOtpSms = async (mobile, otp, purpose = 'registration') => {
  const messages = {
    registration: `Your FinanceLoan registration OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`,
    login: `Your FinanceLoan login OTP is ${otp}. Valid for 10 minutes.`,
    password_reset: `Your FinanceLoan password reset OTP is ${otp}. Valid for 10 minutes.`,
    phone_verification: `Your FinanceLoan phone verification OTP is ${otp}. Valid for 10 minutes.`,
    transaction: `Your FinanceLoan transaction OTP is ${otp}. Valid for 10 minutes.`,
  };

  const message = messages[purpose] || `Your FinanceLoan OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`;
  return sendSms({ to: mobile, message });
};

/**
 * Send Loan Status SMS
 */
export const sendLoanStatusSms = async (mobile, loanId, status) => {
  const messages = {
    approved: `Congratulations! Your loan ${loanId} has been approved. - FinanceLoan`,
    active: `Congratulations! Your loan ${loanId} has been approved and disbursed. - FinanceLoan`,
    pending: `Your loan ${loanId} application has been received and is under review. - FinanceLoan`,
    rejected: `Your loan ${loanId} application was rejected. Contact support for details. - FinanceLoan`,
    disbursed: `Your loan ${loanId} amount has been disbursed. - FinanceLoan`,
  };
  const message = messages[status] || `Your loan ${loanId} status has been updated to: ${status}. - FinanceLoan`;
  return sendSms({ to: mobile, message });
};

/**
 * Send EMI Reminder SMS
 */
export const sendEmiReminderSms = async (mobile, emiNumber, amount, dueDate) => {
  const message = `Namaste! Aapka EMI #${emiNumber} of Rs.${amount} due date ${dueDate} hai. Time pe payment karein penalty avoid karne ke liye. - FinanceLoan`;
  return sendSms({ to: mobile, message });
};

/**
 * Send Penalty SMS
 */
export const sendPenaltySms = async (mobile, emiNumber, penalty) => {
  const message = `Late payment penalty of Rs.${penalty} applied on EMI #${emiNumber}. Please pay immediately. - FinanceLoan`;
  return sendSms({ to: mobile, message });
};

/**
 * Send EMI Paid SMS
 */
export const sendEmiPaidSms = async (mobile, emiNumber, amount) => {
  const message = `EMI #${emiNumber} of Rs.${amount} received successfully. Thank you! - FinanceLoan`;
  return sendSms({ to: mobile, message });
};

/**
 * Generate 6-digit OTP
 */
export const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

/**
 * Check SMS Rate Limit
 */
export const checkSmsRateLimit = async (mobile) => {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentSms = await Otp.countDocuments({
    mobile,
    createdAt: { $gt: oneMinuteAgo }
  });

  const dailySms = await Otp.countDocuments({
    mobile,
    createdAt: { $gt: oneDayAgo }
  });

  if (recentSms >= SMS_RATE_LIMIT.perMinute) {
    throw new Error('Too many OTP requests. Please wait a minute.');
  }

  if (dailySms >= SMS_RATE_LIMIT.perDay) {
    throw new Error('Daily OTP limit exceeded. Please try tomorrow.');
  }

  return true;
};

/**
 * Create and store OTP
 */
export const createOtp = async (mobile, purpose = 'registration') => {
  // Check rate limit
  await checkSmsRateLimit(mobile);
  
  // Invalidate previous OTPs
  await Otp.deleteMany({ mobile, purpose, isVerified: false });

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await Otp.create({ mobile, otp, purpose, expiresAt });

  // Send OTP via SMS
  await sendOtpSms(mobile, otp, purpose);

  return otp;
};

/**
 * Verify OTP
 */
export const verifyOtp = async (mobile, otp, purpose = 'registration') => {
  const record = await Otp.findOne({
    mobile,
    purpose,
    isVerified: false,
    expiresAt: { $gt: new Date() },
  }).sort('-createdAt');

  if (!record) {
    return { valid: false, message: 'OTP expired or not found' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { valid: false, message: 'Maximum OTP attempts exceeded' };
  }

  if (record.otp !== otp) {
    record.attempts += 1;
    await record.save();
    return { valid: false, message: 'Invalid OTP' };
  }

  record.isVerified = true;
  await record.save();
  return { valid: true };
};

/**
 * Twilio Webhook Handler - Status Callback
 */
export const handleSmsStatusCallback = async (req, res) => {
  try {
    const { MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage } = req.body;
    
    // Log SMS status
    console.log(`SMS Status Update: ${MessageSid} -> ${MessageStatus}`);
    
    if (ErrorCode) {
      console.error(`SMS Error: ${ErrorCode} - ${ErrorMessage}`);
    }
    
    // Update your database with delivery status
    // await SmsLog.updateOne({ messageId: MessageSid }, { status: MessageStatus });
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Status callback error:', error.message);
    res.status(500).send('Error');
  }
};

/**
 * Create notification
 */
export const createNotification = async ({ user, title, message, type = 'info', link, metadata }) => {
  try {
    return await Notification.create({ user, title, message, type, link, metadata });
  } catch (error) {
    console.error('Notification error:', error.message);
    return null;
  }
};

/**
 * Create loan-related notification
 */
export const notifyLoanUpdate = async (userId, loan, status) => {
  const messages = {
    approved: 'Your loan has been approved!',
    rejected: 'Your loan application was rejected.',
    disbursed: 'Loan amount has been disbursed.',
    closed: 'Your loan has been closed.',
    pending: 'Your loan application is under review.',
  };
  return createNotification({
    user: userId,
    title: `Loan ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: messages[status] || `Loan status updated to ${status}`,
    type: 'loan',
    link: `/loans/${loan._id}`,
    metadata: { loanId: loan.loanId },
  });
};

/**
 * Create EMI-related notification
 */
export const notifyEMIUpdate = async (userId, emi, loan, action) => {
  const messages = {
    due: `EMI #${emi.emiNumber} of ₹${emi.amount} is due on ${new Date(emi.dueDate).toLocaleDateString('en-IN')}`,
    paid: `EMI #${emi.emiNumber} payment of ₹${emi.amount} received successfully.`,
    overdue: `EMI #${emi.emiNumber} is overdue. Please pay immediately to avoid penalties.`,
  };
  return createNotification({
    user: userId,
    title: `EMI ${action.charAt(0).toUpperCase() + action.slice(1)}`,
    message: messages[action] || `EMI update: ${action}`,
    type: 'emi',
    link: `/emis`,
    metadata: { emiNumber: emi.emiNumber, loanId: loan.loanId },
  });
};