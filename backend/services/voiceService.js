// services/voiceService.js — Twilio Voice outbound calls (EMI reminders)
// Does not alter SMS or API routes/responses.

import twilio from 'twilio';

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

const formatDueDateSpoken = (dueDate) => {
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return String(dueDate || '');
  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Place outbound Twilio voice call for EMI reminder.
 * Message: amount + due date + penalty warning.
 */
export const sendEmiReminderCall = async (mobile, emiNumber, amount, dueDate) => {
  try {
    const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return { success: false, error: 'Invalid phone number' };
    }

    const to = `+91${digits}`;
    const amt = Math.round(Number(amount) || 0);
    const dateSpoken = formatDueDateSpoken(dueDate);
    const emiLabel = emiNumber ? ` number ${emiNumber}` : '';

    // Clear spoken English for Twilio TTS (en-IN)
    const sayText =
      `Namaskar. This is a reminder from Prabhavi Small Finance. ` +
      `Your E M I${emiLabel} of rupees ${amt} is due on ${dateSpoken}. ` +
      `Please pay on time, otherwise penalty will apply. Thank you.`;

    const simulationMode =
      String(process.env.TWILIO_SIMULATION_MODE || '').trim().toLowerCase() === 'true';

    if (simulationMode) {
      console.log(`[SIMULATION] Would call ${to}: ${sayText}`);
      return {
        success: true,
        callSid: `SIM_CALL_${Date.now()}`,
        status: 'simulated',
        provider: 'simulation',
        note: 'Voice simulation mode - no actual call placed',
      };
    }

    const { accountSid, authToken, phoneNumber } = getTwilioConfig();

    if (!accountSid || !authToken || isPlaceholder(accountSid) || isPlaceholder(authToken)) {
      return { success: false, error: 'Twilio credentials are missing or invalid', provider: 'twilio' };
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
        error: 'Set TWILIO_PHONE_NUMBER (voice-capable) in backend/.env for outbound calls',
        provider: 'twilio',
      };
    }

    const twiml =
      `<Response>` +
      `<Say voice="Polly.Aditi" language="en-IN">${escapeXml(sayText)}</Say>` +
      `<Pause length="1"/>` +
      `<Say voice="Polly.Aditi" language="en-IN">${escapeXml(sayText)}</Say>` +
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
    };
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

export default { sendEmiReminderCall };
