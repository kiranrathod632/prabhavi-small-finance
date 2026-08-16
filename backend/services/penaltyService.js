import EMI from '../models/EMI.js';
import Loan from '../models/Loan.js';
import { getSettings } from './settingsService.js';
import { calculatePenalty } from '../utils/helpers.js';
import { createNotification } from './notificationService.js';
import { sendPenaltySms, sendEmiReminderSms } from './smsService.js';
import { sendEmiReminderCall } from './voiceService.js';
import { sendEMIReminderEmail } from './emailService.js';
import User from '../models/User.js';
import RecoveryCase from '../models/RecoveryCase.js';

/**
 * Apply penalties to overdue EMIs
 */
export const applyOverduePenalties = async () => {
  const settings = await getSettings();
  if (!settings.penaltyEnabled) return { updated: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueEmis = await EMI.find({
    status: { $in: ['pending', 'partial', 'pending_collection'] },
    dueDate: { $lt: today },
    isDeleted: { $ne: true },
  }).populate('loan', 'loanId').populate('user', 'name email');

  let updated = 0;

  for (const emi of overdueEmis) {
    const daysOverdue = Math.ceil((today - new Date(emi.dueDate)) / (1000 * 60 * 60 * 24));
    const { lateFee, dailyPenalty, totalPenalty } = calculatePenalty(emi, settings, daysOverdue);

    if (totalPenalty > 0 && emi.status !== 'overdue') {
      // Keep pending_collection so admin still sees user's payment request
      if (emi.status !== 'pending_collection') {
        emi.status = 'overdue';
      }
      emi.lateFee = lateFee;
      emi.dailyPenalty = dailyPenalty;
      emi.penalty = totalPenalty;
      emi.penaltyAppliedAt = new Date();
      emi.pendingAmount = emi.amount + totalPenalty - (emi.paidAmount || 0);
      await emi.save();
      updated++;

      // Create recovery case if not exists
      const existingCase = await RecoveryCase.findOne({
        emi: emi._id,
        isDeleted: { $ne: true },
      });
      if (!existingCase) {
        await RecoveryCase.create({
          user: emi.user._id,
          loan: emi.loan._id,
          emi: emi._id,
          status: 'pending',
          priority: daysOverdue > 30 ? 'critical' : daysOverdue > 15 ? 'high' : 'medium',
          overdueAmount: emi.pendingAmount,
          penaltyAmount: totalPenalty,
          daysOverdue,
        });
      }

      await createNotification({
        user: emi.user._id,
        title: 'Penalty Applied',
        message: `Late payment penalty of ₹${totalPenalty} applied on EMI #${emi.emiNumber}`,
        type: 'warning',
        link: '/emis',
      });

      const profile = await User.findById(emi.user._id);
      const userMobile = profile?.mobile_number || profile?.mobile;
      if (userMobile) {
        await sendPenaltySms(userMobile, emi.emiNumber, totalPenalty);
      }
    }
  }

  return { updated };
};

/**
 * Send upcoming EMI SMS reminders via Twilio.
 * Example due 28th → SMS on 26th and 27th at 11:00 AM IST (once each day).
 * No SMS on day-3 (25th). Does not change API routes/responses.
 */
export const sendUpcomingReminders = async (daysBeforeList = [2, 1]) => {
  const days = (Array.isArray(daysBeforeList) ? daysBeforeList : [daysBeforeList])
    .map((d) => Number(d))
    .filter((d) => d === 1 || d === 2);

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const dueDates = [];

  for (const daysBefore of days) {
    const today = new Date();
    const targetDue = new Date(today);
    targetDue.setDate(targetDue.getDate() + daysBefore);
    targetDue.setHours(0, 0, 0, 0);

    const targetDueEnd = new Date(targetDue);
    targetDueEnd.setHours(23, 59, 59, 999);
    dueDates.push(targetDue.toISOString().slice(0, 10));

    const slotKey = `sms${daysBefore}`;
    const path = `reminderSmsSlots.${slotKey}`;

    const upcomingEmis = await EMI.find({
      status: { $in: ['pending', 'partial'] },
      dueDate: { $gte: targetDue, $lte: targetDueEnd },
      [path]: null,
      isDeleted: { $ne: true },
    })
      .populate('loan', 'loanId')
      .populate('user', 'name email mobile mobile_number');

    for (const emi of upcomingEmis) {
      // Day-2: respect legacy reminderSmsSentAt so older runs are not duplicated
      if (daysBefore === 2 && emi.reminderSmsSentAt) {
        if (!emi.reminderSmsSlots) emi.reminderSmsSlots = {};
        emi.reminderSmsSlots[slotKey] = emi.reminderSmsSentAt;
        await emi.save({ validateBeforeSave: false });
        skipped += 1;
        continue;
      }

      const dueLabel = new Date(emi.dueDate).toLocaleDateString('en-IN');

      await createNotification({
        user: emi.user._id,
        title: 'Upcoming EMI',
        message: `EMI #${emi.emiNumber} of ₹${emi.amount} is due on ${dueLabel}`,
        type: 'emi',
        link: '/emis',
      });

      if (emi.user?.email) {
        await sendEMIReminderEmail(emi.user, emi, emi.loan);
      }

      const userMobile = emi.user?.mobile_number || emi.user?.mobile;
      if (!userMobile) {
        skipped += 1;
        continue;
      }

      const smsResult = await sendEmiReminderSms(
        userMobile,
        emi.emiNumber,
        emi.pendingAmount > 0 ? emi.pendingAmount : emi.amount,
        emi.dueDate
      );

      if (smsResult?.success) {
        if (!emi.reminderSmsSlots) emi.reminderSmsSlots = {};
        emi.reminderSmsSlots[slotKey] = new Date();
        // Keep legacy field for tools that still read it
        emi.reminderSmsSentAt = emi.reminderSmsSlots[slotKey];
        await emi.save({ validateBeforeSave: false });
        sent += 1;
        console.log(
          `[EMI Reminder] ✅ SMS D-${daysBefore} → ${userMobile} | ${emi.emiNumber}`
        );
      } else {
        failed += 1;
        console.error(
          `[EMI Reminder] ❌ SMS D-${daysBefore} failed for EMI ${emi.emiNumber}:`,
          smsResult?.error || 'unknown error'
        );
      }
    }
  }

  console.log(
    `[EMI Reminder] days=${days.join(',')} | SMS sent=${sent} | failed=${failed} | skipped=${skipped}`
  );
  return { sent, failed, skipped, daysBefore: days, dueDates };
};

const CALL_DAYS_BEFORE = [3, 2, 1];

const slotKeyFor = (slot, daysBefore) => {
  const isEvening = String(slot).toLowerCase() === 'evening';
  return `${isEvening ? 'evening' : 'morning'}${daysBefore}`;
};

/**
 * Place voice calls for EMIs due in 3 / 2 / 1 day(s).
 * Example due 25th:
 *   22nd, 23rd, 24th → morning 10 AM + evening 6 PM
 * slot: 'morning' | 'evening'
 * daysBeforeList: default [3, 2, 1]
 * Does not change SMS reminders or API responses.
 */
export const sendUpcomingReminderCalls = async (
  slot = 'morning',
  daysBeforeList = CALL_DAYS_BEFORE
) => {
  const isEvening = String(slot).toLowerCase() === 'evening';
  const legacyField = isEvening ? 'reminderCallEveningSentAt' : 'reminderCallMorningSentAt';
  const slotLabel = isEvening ? 'evening-6PM' : 'morning-10AM';
  const days = (Array.isArray(daysBeforeList) ? daysBeforeList : [daysBeforeList])
    .map((d) => Number(d))
    .filter((d) => d === 1 || d === 2 || d === 3);

  let called = 0;
  let failed = 0;
  let skipped = 0;
  const dueDates = [];

  for (const daysBefore of days) {
    const today = new Date();
    const targetDue = new Date(today);
    targetDue.setDate(targetDue.getDate() + daysBefore);
    targetDue.setHours(0, 0, 0, 0);

    const targetDueEnd = new Date(targetDue);
    targetDueEnd.setHours(23, 59, 59, 999);
    dueDates.push(targetDue.toISOString().slice(0, 10));

    const key = slotKeyFor(slot, daysBefore);
    const path = `reminderCallSlots.${key}`;

    const upcomingEmis = await EMI.find({
      status: { $in: ['pending', 'partial'] },
      dueDate: { $gte: targetDue, $lte: targetDueEnd },
      [path]: null,
      isDeleted: { $ne: true },
    })
      .populate('loan', 'loanId')
      .populate('user', 'name email mobile mobile_number');

    for (const emi of upcomingEmis) {
      // Skip day-2 if legacy single-slot flag already set (older cron)
      if (daysBefore === 2 && emi[legacyField]) {
        if (!emi.reminderCallSlots) emi.reminderCallSlots = {};
        emi.reminderCallSlots[key] = emi[legacyField];
        await emi.save({ validateBeforeSave: false });
        skipped += 1;
        continue;
      }

      const userMobile = emi.user?.mobile_number || emi.user?.mobile;
      if (!userMobile) {
        skipped += 1;
        continue;
      }

      const payAmount = emi.pendingAmount > 0 ? emi.pendingAmount : emi.amount;
      const callResult = await sendEmiReminderCall(
        userMobile,
        emi.emiNumber,
        payAmount,
        emi.dueDate,
        emi.user?.name
      );

      if (callResult?.success) {
        if (!emi.reminderCallSlots) emi.reminderCallSlots = {};
        emi.reminderCallSlots[key] = new Date();
        // Keep legacy fields in sync for day-2 (compat with older tools)
        if (daysBefore === 2) {
          emi[legacyField] = emi.reminderCallSlots[key];
        }
        await emi.save({ validateBeforeSave: false });
        called += 1;
        console.log(
          `[EMI Call Reminder] ✅ ${slotLabel} D-${daysBefore} → ${userMobile} | ${emi.emiNumber} | Rs.${Math.round(payAmount || 0)}`
        );
      } else {
        failed += 1;
        console.error(
          `[EMI Call Reminder] ❌ ${slotLabel} D-${daysBefore} → ${userMobile} | ${emi.emiNumber}:`,
          callResult?.error || 'unknown error'
        );
      }
    }
  }

  console.log(
    `[EMI Call Reminder] slot=${slotLabel} days=${days.join(',')} | called=${called} | failed=${failed} | skipped=${skipped}`
  );
  return {
    slot: slotLabel,
    daysBefore: days,
    called,
    failed,
    skipped,
    dueDates,
  };
};

/**
 * TEST helper: every 5 min — SMS for latest pending EMI(s), regardless of due date.
 * Does not change production daily reminder behaviour (sendUpcomingReminders).
 */
export const sendTestUpcomingReminders = async () => {
  const limit = Math.max(1, parseInt(process.env.EMI_REMINDER_TEST_LIMIT || '1', 10) || 1);

  // Check if we should use simulation mode
  const simulationMode = String(process.env.TWILIO_SIMULATION_MODE || '').trim().toLowerCase() === 'true';

  const pendingEmis = await EMI.find({
    status: { $in: ['pending', 'partial', 'overdue'] },
    isDeleted: { $ne: true },
  })
    .sort({ dueDate: 1, createdAt: -1 }) // nearest / latest pending first
    .limit(limit)
    .populate('loan', 'loanId')
    .populate('user', 'name email mobile mobile_number');

  let sent = 0;
  let failed = 0;
  let rateLimited = 0;
  let skipped = 0;

  console.log(`[EMI Test Reminder] Latest pending EMIs (any due date) | matching=${pendingEmis.length} | simulation=${simulationMode}`);

  for (const emi of pendingEmis) {
    const userMobile = emi.user?.mobile_number || emi.user?.mobile;
    if (!userMobile) {
      console.warn(`[EMI Test Reminder] No mobile for EMI ${emi.emiNumber}`);
      skipped++;
      continue;
    }

    // Check if we already sent a reminder recently (rate limit per EMI)
    if (!simulationMode && emi.reminderSmsSentAt) {
      const hoursSinceLastSent = (Date.now() - new Date(emi.reminderSmsSentAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSent < 4) {
        console.log(`[EMI Test Reminder] Skipping ${emi.emiNumber} - last sent ${hoursSinceLastSent.toFixed(1)} hours ago`);
        skipped++;
        continue;
      }
    }

    const payAmount = emi.pendingAmount > 0 ? emi.pendingAmount : emi.amount;
    const smsAmount = payAmount || emi.principal || emi.amount;

    const smsResult = await sendEmiReminderSms(
      userMobile,
      emi.emiNumber,
      smsAmount,
      emi.dueDate
    );

    if (smsResult?.success) {
      sent += 1;
      if (process.env.EMI_REMINDER_TEST_MARK_SENT === 'true') {
        emi.reminderSmsSentAt = new Date();
        await emi.save({ validateBeforeSave: false });
      }
      console.log(
        `[EMI Test Reminder] ✅ SMS OK → ${userMobile} | ${emi.emiNumber} | Rs.${Math.round(smsAmount)} | due=${emi.dueDate?.toISOString?.() || emi.dueDate}`
      );
    } else {
      failed += 1;
      const errText =
        typeof smsResult?.error === 'string'
          ? smsResult.error
          : smsResult?.error != null
            ? JSON.stringify(smsResult.error)
            : 'unknown';
      // Check if it's a rate limit error
      if (smsResult?.code === 63038 || errText.toLowerCase().includes('daily message limit')) {
        rateLimited += 1;
        console.error(
          `[EMI Test Reminder] ⚠️ RATE LIMITED → ${userMobile} | ${emi.emiNumber}: ${errText}`
        );
      } else {
        console.error(
          `[EMI Test Reminder] ❌ SMS FAIL → ${userMobile} | ${emi.emiNumber}:`,
          errText
        );
      }
    }
  }

  console.log(
    `[EMI Test Reminder] Done | found=${pendingEmis.length} | sent=${sent} | failed=${failed} | rateLimited=${rateLimited} | skipped=${skipped}`
  );
  
  return { sent, failed, rateLimited, skipped, total: pendingEmis.length };
};
