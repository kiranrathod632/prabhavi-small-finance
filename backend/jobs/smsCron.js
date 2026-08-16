import cron from 'node-cron';
import {
  sendUpcomingReminders,
  sendUpcomingReminderCalls,
  sendTestUpcomingReminders,
} from '../services/penaltyService.js';

/**
 * Register SMS/Voice cron jobs (EMI reminders) — Twilio.
 * Does not alter API routes/responses.
 *
 * Example: EMI due on 28th
 *   - 25th 10:00 AM + 6:00 PM — call
 *   - 26th 10:00 AM + 6:00 PM — call
 *   - 26th 11:00 AM           — SMS (once)
 *   - 27th 10:00 AM + 6:00 PM — call
 *   - 27th 11:00 AM           — SMS (once)
 */
export const startSmsCronJobs = () => {
  // Morning voice calls — EMIs due in 3 / 2 / 1 day(s)
  cron.schedule(
    '0 10 * * *',
    async () => {
      try {
        console.log('[Cron] EMI morning call started (10 AM) for D-3/D-2/D-1');
        await sendUpcomingReminderCalls('morning', [3, 2, 1]);
      } catch (e) {
        console.error('EMI morning call cron:', e.message);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );
  console.log('[Cron] EMI morning CALL ENABLED — daily 10:00 AM IST (due in 3/2/1 days)');

  // SMS once per day — 2 days before AND 1 day before due (not day-3)
  cron.schedule(
    '0 11 * * *',
    async () => {
      try {
        console.log('[Cron] EMI SMS reminder started (11 AM) for D-2/D-1');
        await sendUpcomingReminders([2, 1]);
      } catch (e) {
        console.error('EMI SMS reminder cron:', e.message);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );
  console.log('[Cron] EMI SMS reminder ENABLED — daily 11:00 AM IST (due in 2/1 days)');

  // Evening voice calls — EMIs due in 3 / 2 / 1 day(s)
  cron.schedule(
    '0 18 * * *',
    async () => {
      try {
        console.log('[Cron] EMI evening call started (6 PM) for D-3/D-2/D-1');
        await sendUpcomingReminderCalls('evening', [3, 2, 1]);
      } catch (e) {
        console.error('EMI evening call cron:', e.message);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );
  console.log('[Cron] EMI evening CALL ENABLED — daily 6:00 PM IST (due in 3/2/1 days)');

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
