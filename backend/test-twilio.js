/**
 * CLI Twilio smoke test (SMS + Call).
 * Usage:
 *   node test-twilio.js sms 9xxxxxxxxx
 *   node test-twilio.js call 9xxxxxxxxx
 *   node test-twilio.js otp 9xxxxxxxxx
 *   node test-twilio.js emi 9xxxxxxxxx
 */
import dotenv from 'dotenv';
import { testTwilioSms } from './services/smsService.js';
import { testTwilioCall } from './services/voiceService.js';

dotenv.config();

const [mode = 'sms', mobile] = process.argv.slice(2);

const run = async () => {
  if (!mobile) {
    console.error('Usage: node test-twilio.js <sms|call|otp|emi> <10-digit-mobile>');
    process.exit(1);
  }

  console.log(`[Twilio Test] mode=${mode} mobile=${mobile}`);
  console.log(`[Twilio Test] TWILIO_SIMULATION_MODE=${process.env.TWILIO_SIMULATION_MODE || 'false'}`);

  let result;
  if (mode === 'call') {
    result = await testTwilioCall(mobile, { name: 'Test', amount: 250, dueDate: new Date(Date.now() + 2 * 86400000) });
  } else if (mode === 'otp') {
    result = await testTwilioSms(mobile, { purpose: 'otp' });
  } else if (mode === 'emi') {
    result = await testTwilioSms(mobile, { purpose: 'emi', emiNumber: 'EMI-TEST', amount: 250 });
  } else {
    result = await testTwilioSms(mobile, { purpose: 'custom' });
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
