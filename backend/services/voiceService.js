// services/voiceService.js — EMI reminder calls (Vobiz / Twilio)
// Piopiy and MSG91 removed

import twilio from 'twilio';
import { buildMarathiEmiCallScript } from '../utils/emiCallScript.js';
import { sendVobizCall } from './vobizService.js';

const getVoiceProvider = () =>
  String(process.env.VOICE_PROVIDER || process.env.EMI_VOICE_PROVIDER || 'vobiz')
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
 * Production EMI reminder call — Vobiz or Twilio
 */
export const sendEmiReminderCall = async (mobile, emiNumber, amount, dueDate, name) => {
  const provider = getVoiceProvider();
  
  // Vobiz - Primary provider
  if (provider === 'vobiz') {
    const vobizResult = await sendVobizCall(mobile, { name, amount, dueDate, emiNumber });
    
    // If Vobiz fails, fallback to Twilio
    if (!vobizResult?.success) {
      const missingConfig = /VOBIZ_AUTH_ID|VOBIZ_AUTH_TOKEN|VOBIZ_FROM_NUMBER/i.test(
        String(vobizResult?.error || '')
      );
      const allowFallback =
        String(process.env.VOICE_FALLBACK_TWILIO || 'true').trim().toLowerCase() !== 'false';

      if (missingConfig && allowFallback) {
        console.warn('[Voice] Vobiz not configured — falling back to Twilio');
        const twilioResult = await testTwilioCall(mobile, { name, amount, dueDate, emiNumber });
        return {
          ...twilioResult,
          fallbackFrom: 'vobiz',
          vobizError: vobizResult?.error,
          note: twilioResult.success
            ? 'Vobiz config missing — call sent via Twilio fallback.'
            : twilioResult.note || twilioResult.error,
        };
      }
    }
    return vobizResult;
  }

  // Twilio - Secondary provider
  if (provider === 'twilio') {
    return testTwilioCall(mobile, { name, amount, dueDate, emiNumber });
  }

  // Default: Try Vobiz first, then fallback to Twilio
  const vobizResult = await sendVobizCall(mobile, { name, amount, dueDate, emiNumber });
  if (vobizResult?.success) return vobizResult;

  const allowFallback =
    String(process.env.VOICE_FALLBACK_TWILIO || 'true').trim().toLowerCase() !== 'false';

  if (allowFallback) {
    console.warn('[Voice] Vobiz failed — falling back to Twilio');
    const twilioResult = await testTwilioCall(mobile, { name, amount, dueDate, emiNumber });
    return {
      ...twilioResult,
      fallbackFrom: 'vobiz',
      vobizError: vobizResult?.error,
      note: twilioResult.success
        ? 'Vobiz call failed — sent via Twilio fallback.'
        : twilioResult.note || twilioResult.error,
    };
  }

  return vobizResult;
};

/**
 * Voice test — follows VOICE_PROVIDER (same as EMI cron)
 */
export const testVoiceCall = async (mobile, options = {}) => {
  const provider = getVoiceProvider();
  
  if (provider === 'vobiz') {
    return sendVobizCall(mobile, options);
  }
  
  if (provider === 'twilio') {
    return testTwilioCall(mobile, options);
  }

  // Default: Try Vobiz
  const vobizResult = await sendVobizCall(mobile, options);
  if (vobizResult?.success) return vobizResult;

  const allowFallback =
    String(process.env.VOICE_FALLBACK_TWILIO || 'true').trim().toLowerCase() !== 'false';

  if (allowFallback) {
    const twilioResult = await testTwilioCall(mobile, options);
    return {
      ...twilioResult,
      fallbackFrom: 'vobiz',
      vobizError: vobizResult?.error,
      note: twilioResult.success
        ? 'Vobiz call failed — sent via Twilio fallback.'
        : twilioResult.error,
    };
  }

  return vobizResult;
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
        amount: options.amount,
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