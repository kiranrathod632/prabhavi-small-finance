// services/voiceService.js — Twilio voice (EMI reminders + test)
// Does not alter SMS, OTP, or API routes/responses.

import twilio from 'twilio';
import { buildMarathiEmiCallScript } from '../utils/emiCallScript.js';

const getTwilioConfig = () => ({
  accountSid: (process.env.TWILIO_ACCOUNT_SID || '').replace(/\s+/g, '').trim(),
  authToken: (process.env.TWILIO_AUTH_TOKEN || '').replace(/\s+/g, '').trim(),
  phoneNumber: (
    process.env.TWILIO_PHONE_NUMBER ||
    process.env.TWILIO_PHONE ||
    process.env.TWILIO_VOICE_FROM ||
    ''
  )
    .replace(/\s+/g, '')
    .trim(),
});

const isPlaceholder = (value = '') =>
  !value ||
  /^your[_-]/i.test(value) ||
  /xxx|replace|changeme|example/i.test(value);

const escapeXml = (text = '') =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Place outbound Twilio voice call with Marathi EMI script.
 */
const placeTwilioCall = async (mobile, { name, amount, dueDate, message } = {}) => {
  const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return { success: false, error: 'Invalid phone number', provider: 'twilio' };
  }

  const to = `+91${digits}`;
  const sayText =
    message ||
    buildMarathiEmiCallScript({
      name,
      amount: amount != null ? amount : 250,
      dueDate: dueDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    });

  const simulationMode =
    String(process.env.TWILIO_SIMULATION_MODE || '').trim().toLowerCase() === 'true';

  if (simulationMode) {
    console.log(`[SIMULATION] Twilio would call ${to}: ${sayText}`);
    return {
      success: true,
      callSid: `SIM_TWILIO_CALL_${Date.now()}`,
      status: 'simulated',
      provider: 'twilio',
      sayText,
      note: 'TWILIO_SIMULATION_MODE=true — no actual call placed',
    };
  }

  const { accountSid, authToken, phoneNumber } = getTwilioConfig();

  if (!accountSid || !authToken || isPlaceholder(accountSid) || isPlaceholder(authToken)) {
    return {
      success: false,
      error: 'Twilio credentials are missing or invalid',
      provider: 'twilio',
    };
  }

  if (!/^AC[a-f0-9]{32}$/i.test(accountSid)) {
    return {
      success: false,
      error: 'Invalid TWILIO_ACCOUNT_SID format',
      provider: 'twilio',
    };
  }

  if (!phoneNumber || isPlaceholder(phoneNumber)) {
    return {
      success: false,
      error: 'Set TWILIO_PHONE_NUMBER (voice-capable) in backend/.env',
      provider: 'twilio',
    };
  }

  const twiml =
    `<Response>` +
    `<Say voice="Polly.Aditi" language="hi-IN">${escapeXml(sayText)}</Say>` +
    `<Pause length="1"/>` +
    `<Say voice="Polly.Aditi" language="hi-IN">${escapeXml(sayText)}</Say>` +
    `</Response>`;

  const client = twilio(accountSid, authToken);
  console.log(`[Voice] Twilio call → ${to} from ${phoneNumber}`);
  const call = await client.calls.create({
    twiml,
    to,
    from: phoneNumber,
  });

  console.log(`[Voice] Twilio accepted: ${call.sid} status=${call.status}`);
  return {
    success: true,
    callSid: call.sid,
    status: call.status,
    provider: 'twilio',
    to,
    from: phoneNumber,
    sayText,
  };
};

/**
 * Production EMI reminder call via Twilio (Marathi + user name).
 */
export const sendEmiReminderCall = async (mobile, emiNumber, amount, dueDate, name) => {
  try {
    return await placeTwilioCall(mobile, { name, amount, dueDate });
  } catch (error) {
    console.error('Twilio Voice error:', error.message, error.code, error.moreInfo);
    return {
      success: false,
      error: error.message,
      provider: 'twilio',
      code: error.code,
    };
  }
};

/**
 * Twilio voice test call — does not change EMI cron or other APIs.
 */
export const testTwilioCall = async (mobile, options = {}) => {
  try {
    const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return { success: false, error: 'Invalid Indian mobile number', provider: 'twilio' };
    }
    return await placeTwilioCall(mobile, options);
  } catch (error) {
    console.error('Twilio Voice test error:', error.message, error.code, error.moreInfo);
    return {
      success: false,
      error: error.message,
      provider: 'twilio',
      code: error.code,
      moreInfo: error.moreInfo,
    };
  }
};

export default { sendEmiReminderCall, testTwilioCall };
