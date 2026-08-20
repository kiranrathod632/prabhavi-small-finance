import twilio from 'twilio';
import Otp from '../models/Otp.js';
import Notification from '../models/Notification.js';
// import { sendMsg91Sms, sendMsg91OtpSms } from './msg91Service.js';

const getSmsProvider = () =>
  String(process.env.SMS_PROVIDER || process.env.OTP_SMS_PROVIDER || 'twilio')
    .trim()
    .toLowerCase();

const getTwilioConfig = () => ({
  accountSid: (process.env.TWILIO_ACCOUNT_SID || '').replace(/\s+/g, '').trim(),
  authToken: (process.env.TWILIO_AUTH_TOKEN || '').replace(/\s+/g, '').trim(),
  // Accept TWILIO_PHONE as alias (same as TWILIO_PHONE_NUMBER)
  phoneNumber: (process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_PHONE || '').replace(/\s+/g, '').trim(),
  messagingServiceSid: (process.env.TWILIO_MESSAGING_SERVICE_SID || '').replace(/\s+/g, '').trim(),
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
 * Send SMS via Twilio
 * Tries Active Number (from) first, then Messaging Service SID.
 */
const sendViaTwilio = async ({ mobile, message }) => {
  const formattedNumber = `+91${mobile}`;
  const { accountSid, authToken, phoneNumber, messagingServiceSid } = getTwilioConfig();

  // Check if Twilio is in simulation mode
  const simulationMode = String(process.env.TWILIO_SIMULATION_MODE || '').trim().toLowerCase() === 'true';
  
  if (simulationMode) {
    console.log(`[SIMULATION] Would send SMS to ${formattedNumber}: ${message.substring(0, 50)}...`);
    return {
      success: true,
      messageId: `SIM_${Date.now()}`,
      status: 'simulated',
      provider: 'simulation',
      note: 'SMS simulation mode - no actual SMS sent'
    };
  }

  if (!accountSid || !authToken || isPlaceholder(accountSid) || isPlaceholder(authToken)) {
    return { success: false, error: 'Twilio credentials are missing or invalid', provider: 'twilio' };
  }

  if (!/^AC[a-f0-9]{32}$/i.test(accountSid)) {
    return {
      success: false,
      error: 'Invalid TWILIO_ACCOUNT_SID format. Copy full Account SID from Twilio Console (starts with AC).',
      provider: 'twilio',
    };
  }

  if (!phoneNumber && !messagingServiceSid) {
    return {
      success: false,
      error: 'Set TWILIO_PHONE_NUMBER (Active Number) or TWILIO_MESSAGING_SERVICE_SID in backend/.env',
      provider: 'twilio',
    };
  }

  const client = twilio(accountSid, authToken);
  const attempts = [];

  // Prefer Twilio Active Number as sender (most reliable on trial)
  if (phoneNumber) {
    attempts.push({ from: phoneNumber, to: formattedNumber, body: message });
  }
  if (messagingServiceSid) {
    attempts.push({ messagingServiceSid, to: formattedNumber, body: message });
  }

  let lastError = null;
  for (const messageOptions of attempts) {
    try {
      console.log(
        `[SMS] Twilio → ${formattedNumber} via ${
          messageOptions.from ? `from ${messageOptions.from}` : `MS ${messageOptions.messagingServiceSid}`
        }`
      );
      const response = await client.messages.create(messageOptions);
      console.log(`[SMS] Twilio accepted: ${response.sid} status=${response.status}`);

      // queued ≠ delivered — poll status so logs show undelivered/failed reason
      let finalStatus = response.status;
      let errorCode = null;
      let errorMessage = null;
      try {
        await new Promise((r) => setTimeout(r, 3500));
        const updated = await client.messages(response.sid).fetch();
        finalStatus = updated.status;
        errorCode = updated.errorCode || null;
        errorMessage = updated.errorMessage || null;
        console.log(
          `[SMS] Twilio delivery check: sid=${response.sid} status=${finalStatus}` +
            (errorCode ? ` errorCode=${errorCode} error=${errorMessage}` : '')
        );
      } catch (pollErr) {
        console.warn(`[SMS] Twilio status poll failed:`, pollErr.message);
      }

      const deliveredOk = ['queued', 'sending', 'sent', 'delivered', 'receiving', 'received'].includes(finalStatus)
        && !errorCode;

      if (errorCode || ['undelivered', 'failed'].includes(finalStatus)) {
        return {
          success: false,
          messageId: response.sid,
          status: finalStatus,
          provider: 'twilio',
          error:
            errorMessage
            || `Twilio status=${finalStatus}. Check Twilio Monitor → Logs → Messaging, and ensure India geo permissions / verified numbers (trial) are configured.`,
          code: errorCode,
        };
      }

      return {
        success: true,
        messageId: response.sid,
        status: finalStatus,
        provider: 'twilio',
        // Helpful when still only "queued/sent" (not yet delivered)
        note: deliveredOk && finalStatus !== 'delivered'
          ? 'Accepted by Twilio but not confirmed delivered yet — check Monitor → Logs → Messaging'
          : undefined,
      };
    } catch (error) {
      lastError = error;
      console.error(`[SMS] Twilio attempt failed:`, error.code, error.message);

      // Handle daily limit exceeded (error code 63038)
      if (error.code === 63038 || error.message?.includes('exceeded the 50 daily messages limit')) {
        return {
          success: false,
          error: `Twilio daily message limit exceeded. Upgrade from trial or wait until tomorrow.`,
          provider: 'twilio',
          code: error.code || 63038,
          retryAfter: '24h'
        };
      }

      if (error.code === 21265 || error.code === 21608 || /unverified|trial/i.test(error.message || '')) {
        return {
          success: false,
          error:
            `Twilio trial can only SMS verified numbers. Verify ${formattedNumber} in Twilio → Phone Numbers → Verified Caller IDs.`,
          provider: 'twilio',
          code: error.code,
        };
      }

      if (error.code === 20003 || error.message === 'Authenticate') {
        return {
          success: false,
          error: 'Twilio auth failed. Re-copy TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN from Twilio Console → Account Info.',
          provider: 'twilio',
          code: error.code,
        };
      }

      // 404 / wrong SID — try next method, then return clear message
      if (
        error.code === 20404
        || error.status === 404
        || /Messages\.json was not found/i.test(error.message || '')
      ) {
        continue;
      }
    }
  }

  if (
    lastError
    && (
      lastError.code === 20404
      || lastError.status === 404
      || /Messages\.json was not found/i.test(lastError.message || '')
    )
  ) {
    return {
      success: false,
      error:
        'Twilio Account SID / Auth Token mismatch (404). Open Twilio Console → Account Info, copy fresh Account SID + Auth Token into backend/.env (no spaces), then restart server.',
      provider: 'twilio',
      code: lastError.code || 20404,
    };
  }

  return {
    success: false,
    error: lastError?.message || 'Twilio send failed',
    provider: 'twilio',
    code: lastError?.code,
  };
};

/**
 * Send SMS via configured provider (twilio | msg91).
 * Default Twilio. EMI reminder SMS stays on PIOPIY (sendEmiReminderSms).
 * @param {{ to: string, message: string }}
 */
export const sendSms = async ({ to, message }) => {
  try {
    const mobile = String(to || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return { success: false, error: 'Invalid phone number' };
    }

    const provider = getSmsProvider();
    if (provider === 'msg91') {
      return sendMsg91Sms({ to: mobile, message });
    }

    try {
      return await sendViaTwilio({ mobile, message });
    } catch (error) {
      console.error('Twilio SMS error:', error.message, error.code, error.moreInfo);
      if (error.code === 21211) return { success: false, error: 'Invalid phone number', provider: 'twilio' };
      if (error.code === 21614) return { success: false, error: 'Invalid phone number format', provider: 'twilio' };
      if (error.message === 'Authenticate' || error.code === 20003) {
        return {
          success: false,
          error: 'Twilio auth failed. Check TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in backend/.env',
          provider: 'twilio',
        };
      }
      return { success: false, error: error.message, provider: 'twilio', code: error.code };
    }
  } catch (error) {
    console.error('SMS send error:', error.message);
    return { success: false, error: error.message };
  }
};

// services/smsService.js

/**
 * Manual test function - sends SMS to a specific number
 * Use this to test individual SMS without the cron
 */
export const manualTestSms = async (mobile, emiNumber, amount, dueDate) => {
  const simulationMode = String(process.env.TWILIO_SIMULATION_MODE || '').trim().toLowerCase() === 'true';
  
  if (simulationMode) {
    console.log(`[MANUAL TEST] Would send EMI reminder to ${mobile}`);
    console.log(`[MANUAL TEST] EMI: ${emiNumber}, Amount: ₹${amount}, Due: ${dueDate}`);
    return { success: true, mode: 'simulation' };
  }

  const result = await sendEmiReminderSms(mobile, emiNumber, amount, dueDate);
  console.log(`[MANUAL TEST] Result:`, result);
  return result;
};

/**
 * Twilio SMS test — does not change OTP / EMI cron / API responses.
 * purpose: 'custom' | 'otp' | 'emi' (default custom)
 */
export const testTwilioSms = async (mobile, options = {}) => {
  const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return { success: false, error: 'Invalid Indian mobile number', provider: 'twilio' };
  }

  const purpose = String(options.purpose || 'custom').toLowerCase();

  if (purpose === 'otp') {
    const otp = options.otp || generateOtp();
    const result = await sendOtpSms(digits, otp, options.otpPurpose || 'verification');
    return { ...result, otp: process.env.NODE_ENV !== 'production' ? otp : undefined, purpose: 'otp' };
  }

  if (purpose === 'emi') {
    return sendEmiReminderSms(
      digits,
      options.emiNumber || 'EMI-TEST',
      options.amount != null ? options.amount : 250,
      options.dueDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    );
  }

  const message =
    options.message ||
    'Prabhavi Small Finance Twilio SMS test. If you received this, SMS is working.';
  const result = await sendSms({ to: digits, message });
  return { ...result, purpose: 'custom' };
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
 * Send OTP SMS (Twilio or MSG91 via SMS_PROVIDER — same caller responses).
 */
export const sendOtpSms = async (mobile, otp, purpose = 'registration') => {
  if (getSmsProvider() === 'msg91') {
    return sendMsg91OtpSms(mobile, otp, purpose);
  }

  const messages = {
    registration: `Your FinanceLoan registration OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`,
    login: `Your FinanceLoan login OTP is ${otp}. Valid for 10 minutes.`,
    password_reset: `Your FinanceLoan password reset OTP is ${otp}. Valid for 10 minutes.`,
    phone_verification: `Your FinanceLoan phone verification OTP is ${otp}. Valid for 10 minutes.`,
    transaction: `Your FinanceLoan transaction OTP is ${otp}. Valid for 10 minutes.`,
    admin_invite: `Your Prabhavi Small Finance admin invite OTP is ${otp}. Valid for 10 minutes.`,
    verification: `Your verification OTP is ${otp}. Valid for 10 minutes.`,
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
 * SMS admin when a user applies for a loan (with account details)
 */
export const sendLoanApplicationAdminSms = async ({ adminMobile, user, loan }) => {
  const account = user.mobile_number || user.mobile || user.email || 'N/A';
  const email = user.email || 'N/A';
  const amount = Number(loan.amount || 0).toLocaleString('en-IN');
  const message =
    `New loan application.\n` +
    `User: ${user.name || 'N/A'}\n` +
    `Account: ${account}\n` +
    `Email: ${email}\n` +
    `Loan ID: ${loan.loanId}\n` +
    `Amount: Rs.${amount}\n` +
    `Type: ${loan.loanType || 'N/A'}\n` +
    `- Prabhavi Small Finance`;
  return sendSms({ to: adminMobile, message });
};

/**
 * Send EMI Reminder SMS via PIOPIY/TeleCMI (OTP / other SMS stay on Twilio).
 * Example: नमस्कार! आपली EMI दिनांक २/८/२०२६ (२ तारीख) रोजी रु.८५८ आहे. वेळेवर भरा, नाहीतर दंड लागेल.
 */
export const sendEmiReminderSms = async (mobile, emiNumber, amount, dueDate) => {
  const amt = Math.round(Number(amount) || 0);
  const parsed = new Date(dueDate);
  const hasDate = !Number.isNaN(parsed.getTime());

  const dateEn = hasDate ? parsed.toLocaleDateString('en-IN') : String(dueDate || '');
  const dateMr = hasDate
    ? parsed.toLocaleDateString('mr-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : dateEn;
  const dayMr = hasDate ? `${parsed.getDate()} तारीख` : '';

  const message =
    `नमस्कार! आपली EMI` +
    `${emiNumber ? ` (${emiNumber})` : ''}` +
    ` रक्कम रु.${amt} आहे. ` +
    `देय दिनांक: ${dateMr}` +
    `${dayMr ? ` (${dayMr} / ${dateEn})` : ''}. ` +
    `कृपया वेळेवर भरा, नाहीतर दंड/पेनल्टी लागेल. - प्रभावी स्मॉल फायनान्स`;

  // return sendPiopiySms({ to: mobile, message });
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
 * SMS admin when a user requests EMI payment (awaiting admin collect)
 */
export const sendEmiPaymentRequestAdminSms = async ({ adminMobile, user, emi, loan, amount }) => {
  const account = user?.mobile_number || user?.mobile || user?.email || 'N/A';
  const amt = Number(amount || 0).toLocaleString('en-IN');
  const message =
    `EMI payment request.\n` +
    `User: ${user?.name || 'N/A'}\n` +
    `Account: ${account}\n` +
    `Loan ID: ${loan?.loanId || 'N/A'}\n` +
    `EMI #: ${emi?.emiNumber || 'N/A'}\n` +
    `Amount: Rs.${amt}\n` +
    `Please collect to mark EMI paid.\n` +
    `- Prabhavi Small Finance`;
  return sendSms({ to: adminMobile, message });
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