import cron from 'node-cron';
import {
  sendUpcomingReminders,
  sendUpcomingReminderCalls,
  sendTestUpcomingReminders,
} from '../services/penaltyService.js';

/**
 * Register SMS/Voice cron jobs (EMI reminders).
 * Call once after server starts. Does not alter API routes/responses.
 *
 * Production:
 *   - 10:00 AM IST — SMS 2 days before EMI due
 *   - 11:00 AM IST — Twilio voice call (same EMIs)
 *   -  6:00 PM IST — Twilio voice call (same EMIs)
 * Optional: every-5-min test SMS when EMI_REMINDER_TEST_EVERY_5_MIN=true
 */
export const startSmsCronJobs = () => {
  // Production: 2 days before EMI due — SMS with amount, date, penalty warning
  cron.schedule(
    '0 10 * * *',
    async () => {
      try {
        console.log('[Cron] 2-day EMI SMS reminder started');
        await sendUpcomingReminders();
      } catch (e) {
        console.error('2-day EMI SMS reminder cron:', e.message);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );
  console.log('[Cron] 2-day EMI SMS reminder ENABLED — daily 10:00 AM IST');

  // Production: Twilio voice calls at 11 AM IST
  cron.schedule(
    '0 11 * * *',
    async () => {
      try {
        console.log('[Cron] 2-day EMI morning call started (11 AM)');
        await sendUpcomingReminderCalls('morning');
      } catch (e) {
        console.error('2-day EMI morning call cron:', e.message);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );
  console.log('[Cron] 2-day EMI morning CALL ENABLED — daily 11:00 AM IST');

  // Production: Twilio voice calls at 6 PM IST
  cron.schedule(
    '0 18 * * *',
    async () => {
      try {
        console.log('[Cron] 2-day EMI evening call started (6 PM)');
        await sendUpcomingReminderCalls('evening');
      } catch (e) {
        console.error('2-day EMI evening call cron:', e.message);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );
  console.log('[Cron] 2-day EMI evening CALL ENABLED — daily 6:00 PM IST');

  const enableEvery5Min =
    String(process.env.EMI_REMINDER_TEST_EVERY_5_MIN || '').trim().toLowerCase() === 'true';

  if (enableEvery5Min) {
    const runEvery5MinReminder = async (reason) => {
      try {
        console.log(`[Cron] EMI reminder every 5 min (${reason})`);
        await sendTestUpcomingReminders();
      } catch (e) {
        console.error('Every-5-min reminder cron:', e.message);
      }
    };

    // Send once immediately on server start
    runEvery5MinReminder('startup');

    cron.schedule(
      '*/5 * * * *',
      () => runEvery5MinReminder('scheduled'),
      { timezone: 'Asia/Kolkata' }
    );
    console.log('[Cron] EMI reminder every 5 minutes ENABLED — pending EMI(s), any due date (incl. today)');
  } else {
    console.log('[Cron] EMI reminder every 5 minutes DISABLED (set EMI_REMINDER_TEST_EVERY_5_MIN=true)');
  }
};

export default startSmsCronJobs;
