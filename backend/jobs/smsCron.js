import cron from 'node-cron';
import { sendTestUpcomingReminders } from '../services/penaltyService.js';

/**
 * Register SMS-related cron jobs (EMI reminders).
 * Call once after server starts. Does not alter API routes/responses.
 *
 * Abhi: sirf every-5-min reminder (2-days-before daily cron disabled).
 */
export const startSmsCronJobs = () => {
  // 2-days-before daily 10:00 AM cron temporarily disabled
  // (kept in penaltyService.sendUpcomingReminders for later restore)

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
