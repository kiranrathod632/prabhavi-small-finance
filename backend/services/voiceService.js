// services/voiceService.js — EMI reminder calls (MSG91 / PIOPIY / Twilio via VOICE_PROVIDER)
// Does not alter SMS, OTP, or API routes/responses.

import twilio from 'twilio';
import { buildMarathiEmiCallScript } from '../utils/emiCallScript.js';
import { sendMsg91EmiReminderCall, testMsg91Call } from './msg91Service.js';

const getVoiceProvider = () =>
  String(process.env.VOICE_PROVIDER || process.env.EMI_VOICE_PROVIDER || 'msg91')
    .trim()
    .toLowerCase();

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
 * Production EMI reminder call — default MSG91.
 * If MSG91 voice DID/template not configured, falls back to Twilio (SMS stays MSG91).
 */
export const sendEmiReminderCall = async (mobile, emiNumber, amount, dueDate, name) => {
  const provider = getVoiceProvider();
  if (provider === 'piopiy') {
    return sendPiopiyEmiReminderCall(mobile, emiNumber, amount, dueDate, name);
  }
  if (provider === 'twilio') {
    return testTwilioCall(mobile, { name, amount, dueDate, emiNumber });
  }

  const msg91Result = await sendMsg91EmiReminderCall(mobile, emiNumber, amount, dueDate, name);
  if (msg91Result?.success) return msg91Result;

  const missingDid = /MSG91_CALLER_ID|VOICE_TEMPLATE|DID/i.test(String(msg91Result?.error || ''));
  const allowFallback =
    String(process.env.VOICE_FALLBACK_TWILIO || 'true').trim().toLowerCase() !== 'false';

  if (missingDid && allowFallback) {
    console.warn('[Voice] MSG91 not configured for calls — falling back to Twilio');
    const twilioResult = await testTwilioCall(mobile, { name, amount, dueDate, emiNumber });
    return {
      ...twilioResult,
      fallbackFrom: 'msg91',
      msg91Error: msg91Result?.error,
      note: twilioResult.success
        ? 'MSG91_CALLER_ID missing — call sent via Twilio. Set MSG91 DID to use MSG91 voice.'
        : twilioResult.note || twilioResult.error,
    };
  }

  return msg91Result;
};

/**
 * Voice test — follows VOICE_PROVIDER (same as EMI cron).
 * For MSG91-only testing use POST /api/msg91/test-call.
 */
export const testVoiceCall = async (mobile, options = {}) => {
  const provider = getVoiceProvider();
  if (provider === 'piopiy') return testPiopiyCall(mobile, options);
  if (provider === 'twilio') return testTwilioCall(mobile, options);

  const msg91Result = await testMsg91Call(mobile, options);
  if (msg91Result?.success) return msg91Result;

  const missingDid = /MSG91_CALLER_ID|VOICE_TEMPLATE|DID/i.test(String(msg91Result?.error || ''));
  const allowFallback =
    String(process.env.VOICE_FALLBACK_TWILIO || 'true').trim().toLowerCase() !== 'false';

  if (missingDid && allowFallback) {
    const twilioResult = await testTwilioCall(mobile, options);
    return {
      ...twilioResult,
      fallbackFrom: 'msg91',
      msg91Error: msg91Result?.error,
      note: twilioResult.success
        ? 'MSG91_CALLER_ID missing — call sent via Twilio fallback.'
        : twilioResult.error,
    };
  }

  return msg91Result;
};

/**
 * Twilio voice test only — does not change EMI cron provider.
 */
export const testTwilioCall = async (mobile, options = {}) => {
  try {
    const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return { success: false, error: 'Invalid Indian mobile number', provider: 'twilio' };
    }

    const to = `+91${digits}`;
    const sayText =
      options.message ||
      buildMarathiEmiCallScript({
        name: options.name,
        amount: options.amount != null ? options.amount : 250,
        dueDate: options.dueDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      });

    const simulationMode =
      String(process.env.TWILIO_SIMULATION_MODE || '').trim().toLowerCase() === 'true';

    if (simulationMode) {
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
      return { success: false, error: 'Twilio credentials are missing or invalid', provider: 'twilio' };
    }
    if (!phoneNumber || isPlaceholder(phoneNumber)) {
      return { success: false, error: 'Set TWILIO_PHONE_NUMBER in backend/.env', provider: 'twilio' };
    }

    const twiml =
      `<Response>` +
      `<Say voice="Polly.Aditi" language="hi-IN">${escapeXml(sayText)}</Say>` +
      `<Pause length="1"/>` +
      `<Say voice="Polly.Aditi" language="hi-IN">${escapeXml(sayText)}</Say>` +
      `</Response>`;

    const client = twilio(accountSid, authToken);
    const call = await client.calls.create({ twiml, to, from: phoneNumber });
    return {
      success: true,
      callSid: call.sid,
      status: call.status,
      provider: 'twilio',
      to,
      from: phoneNumber,
      sayText,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      provider: 'twilio',
      code: error.code,
    };
  }
};

export default { sendEmiReminderCall, testVoiceCall, testTwilioCall };
