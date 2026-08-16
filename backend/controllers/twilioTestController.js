// Test-only Twilio voice endpoint. Does not change existing API responses.

import { testTwilioCall } from '../services/voiceService.js';

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
