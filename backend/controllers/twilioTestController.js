// Test-only Twilio SMS + voice endpoints. Does not change existing API responses.

import { testTwilioSms } from '../services/smsService.js';
import { testTwilioCall } from '../services/voiceService.js';

export const postTestSms = async (req, res) => {
  try {
    const { mobile, message, purpose, otp, otpPurpose, emiNumber, amount, dueDate } = req.body || {};
    if (!mobile) {
      return res.status(400).json({ success: false, error: 'Mobile number is required' });
    }

    const result = await testTwilioSms(mobile, {
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
    console.error('Twilio test SMS controller error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const postTestCall = async (req, res) => {
  try {
    const { mobile, name, emiNumber, amount, dueDate, message } = req.body || {};
    if (!mobile) {
      return res.status(400).json({ success: false, error: 'Mobile number is required' });
    }

    const result = await testTwilioCall(mobile, {
      name,
      emiNumber,
      amount,
      dueDate,
      message,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Twilio test call controller error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
