/**
 * CLI MSG91 smoke test.
 * Usage (from backend/):
 *   node test-msg91.js sms 9xxxxxxxxx
 *   node test-msg91.js otp 9xxxxxxxxx
 *   node test-msg91.js call 9xxxxxxxxx
 *   node test-msg91.js emi 9xxxxxxxxx
 */
import dotenv from 'dotenv';
import { testMsg91Call, testMsg91Sms } from './services/msg91Service.js';

dotenv.config();

const [mode = 'sms', mobile] = process.argv.slice(2);

const run = async () => {
  if (!mobile) {
    console.error('Usage: node test-msg91.js <sms|otp|emi|call> <10-digit-mobile>');
    process.exit(1);
  }

  console.log(`[MSG91 Test] mode=${mode} mobile=${mobile}`);
  console.log(`[MSG91 Test] SMS_PROVIDER=${process.env.SMS_PROVIDER || 'twilio'}`);
  console.log(`[MSG91 Test] VOICE_PROVIDER=${process.env.VOICE_PROVIDER || 'msg91'}`);
  console.log(`[MSG91 Test] MSG91_SIMULATION_MODE=${process.env.MSG91_SIMULATION_MODE || 'false'}`);

  let result;
  if (mode === 'call') {
    result = await testMsg91Call(mobile, { name: 'Test', amount: 250 });
  } else {
    const purpose = mode === 'otp' || mode === 'emi' ? mode : 'custom';
    result = await testMsg91Sms(mobile, { purpose });
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
