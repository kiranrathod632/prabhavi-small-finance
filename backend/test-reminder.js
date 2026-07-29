// test-reminder.js
import dotenv from 'dotenv';
import { sendEmiReminderSms } from './services/smsService.js';

dotenv.config();

// ✅ Test reminder SMS
const testReminder = async () => {
  console.log('📱 Sending test reminder SMS...');
  
  const mobile = '8007419960';
  const emiNumber = 'EMI-001';
  const amount = '₹5,000';
  const dueDate = '2026-07-30';
  
  try {
    const result = await sendEmiReminderSms(mobile, emiNumber, amount, dueDate);
    
    if (result.success) {
      console.log('✅ SMS sent successfully!');
      console.log('📨 Message ID:', result.messageId);
      console.log(`📱 Sent to: ${mobile}`);
      console.log(`💳 EMI: ${emiNumber}`);
      console.log(`💰 Amount: ${amount}`);
      console.log(`📅 Due Date: ${dueDate}`);
    } else {
      console.error('❌ SMS failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

// Run the test
testReminder();