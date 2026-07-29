import EMI from '../models/EMI.js';
import Loan from '../models/Loan.js';
import { getSettings } from './settingsService.js';
import { calculatePenalty } from '../utils/helpers.js';
import { createNotification } from './notificationService.js';
import { sendPenaltySms, sendEmiReminderSms } from './smsService.js';
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
    status: { $in: ['pending', 'partial'] },
    dueDate: { $lt: today },
    isDeleted: { $ne: true },
  }).populate('loan', 'loanId').populate('user', 'name email');

  let updated = 0;

  for (const emi of overdueEmis) {
    const daysOverdue = Math.ceil((today - new Date(emi.dueDate)) / (1000 * 60 * 60 * 24));
    const { lateFee, dailyPenalty, totalPenalty } = calculatePenalty(emi, settings, daysOverdue);

    if (totalPenalty > 0 && emi.status !== 'overdue') {
      emi.status = 'overdue';
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
 * Send upcoming EMI reminders
 * Rule: if EMI due date is on 5th → SMS goes on 3rd at 10:00 AM (2 days before)
 */
export const sendUpcomingReminders = async () => {
  const today = new Date();
  // Target due date = today + 2 days (e.g. run on 3rd → remind for EMI due on 5th)
  const targetDue = new Date(today);
  targetDue.setDate(targetDue.getDate() + 2);
  targetDue.setHours(0, 0, 0, 0);

  const targetDueEnd = new Date(targetDue);
  targetDueEnd.setHours(23, 59, 59, 999);

  const upcomingEmis = await EMI.find({
    status: { $in: ['pending', 'partial'] },
    dueDate: { $gte: targetDue, $lte: targetDueEnd },
    reminderSmsSentAt: null,
    isDeleted: { $ne: true },
  })
    .populate('loan', 'loanId')
    .populate('user', 'name email mobile mobile_number');

  let sent = 0;

  for (const emi of upcomingEmis) {
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
    if (userMobile) {
      const smsResult = await sendEmiReminderSms(
        userMobile,
        emi.emiNumber,
        emi.amount,
        dueLabel
      );
      if (smsResult?.success) {
        emi.reminderSmsSentAt = new Date();
        await emi.save({ validateBeforeSave: false });
        sent += 1;
      } else {
        console.error(
          `[EMI Reminder] SMS failed for EMI ${emi.emiNumber}:`,
          smsResult?.error || 'unknown error'
        );
      }
    }
  }

  console.log(`[EMI Reminder] Checked due=${targetDue.toDateString()} | SMS sent=${sent}`);
  return { sent, dueDate: targetDue.toISOString().slice(0, 10) };
};
