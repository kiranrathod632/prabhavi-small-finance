// Test-only MSG91 SMS + Call. Does not change existing API responses.

import { testMsg91Call, testMsg91Sms } from '../services/msg91Service.js';
import { testTwilioCall } from '../services/voiceService.js';

export const postTestSms = async (req, res) => {
  try {
    const { mobile, message, purpose, otp, otpPurpose, emiNumber, amount, dueDate } = req.body || {};
    if (!mobile) {
      return res.status(400).json({ success: false, error: 'Mobile number is required' });
    }

    const result = await testMsg91Sms(mobile, {
      message,
      purpose,
      otp,
      otpPurpose,
      emiNumber,
      amount,
      dueDate,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('MSG91 test SMS controller error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const postTestCall = async (req, res) => {
  try {
    const { mobile, name, emiNumber, amount, dueDate, message, fallbackTwilio } = req.body || {};
    if (!mobile) {
      return res.status(400).json({ success: false, error: 'Mobile number is required' });
    }

    let result = await testMsg91Call(mobile, {
      name,
      emiNumber,
      amount,
      dueDate,
      message,
    });

    // Optional: { "fallbackTwilio": true } when MSG91 DID not purchased yet
    const wantFallback =
      fallbackTwilio === true ||
      String(process.env.VOICE_FALLBACK_TWILIO || 'true').trim().toLowerCase() === 'true';
    const missingDid = /MSG91_CALLER_ID|VOICE_TEMPLATE|DID/i.test(String(result?.error || ''));

    if (!result.success && wantFallback && missingDid) {
      const twilioResult = await testTwilioCall(mobile, { name, emiNumber, amount, dueDate, message });
      result = {
        ...twilioResult,
        fallbackFrom: 'msg91',
        msg91Error: result.error,
        note: twilioResult.success
          ? 'MSG91 DID not set — call placed via Twilio. Add MSG91_CALLER_ID for pure MSG91 voice.'
          : twilioResult.error,
      };
    }

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('MSG91 test call controller error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
