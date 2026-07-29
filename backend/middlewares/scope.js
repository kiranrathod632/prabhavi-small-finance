import { ROLES } from '../config/permissions.js';
import User from '../models/User.js';

/**
 * MongoDB filter for admin ownership.
 * - Super Admin: all records
 * - Admin: ONLY records with adminId = their _id
 * - User: own records (user field)
 */
export const getAdminScopeFilter = (user, field = 'adminId') => {
  if (!user) return {};

  if (user.role === ROLES.SUPER_ADMIN) {
    return {};
  }

  if (user.role === ROLES.ADMIN) {
    return { [field]: user._id };
  }

  if (user.role === ROLES.USER) {
    return { user: user._id };
  }

  return { [field]: user._id };
};

/**
 * Loan list filter —
 * - Super Admin / Admin: all loans (admin panel loan management)
 * - User: own loans only
 * Ownership (adminId) is still stored for commission; it does not hide loans from the list.
 */
export const getLoanScopeFilter = async (user) => {
  if (!user) return {};

  if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
    return {};
  }

  if (user.role === ROLES.USER) {
    return { user: user._id };
  }

  // recovery_agent / other staff: own + unassigned
  return {
    $or: [
      { adminId: user._id },
      { adminId: null },
      { adminId: { $exists: false } },
    ],
  };
};

/**
 * When Admin Kiran creates user Amit → adminId = Kiran._id
 * Super Admin can optionally assign adminId in body.
 */
export const resolveAdminId = (creator, bodyAdminId = null) => {
  if (!creator) return bodyAdminId || null;

  switch (creator.role) {
    case ROLES.SUPER_ADMIN:
      return bodyAdminId || null;
    case ROLES.ADMIN:
      return creator._id;
    default:
      return null;
  }
};

/**
 * Can this staff user access a record owned by recordAdminId?
 * Admin panel admins can access all loans; ownership is for commission only.
 */
export const canAccessAdminScope = (user, recordAdminId, recordStatus = null) => {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) return true;

  // Orphan / unassigned records — other staff can access
  if (!recordAdminId) {
    return true;
  }

  return recordAdminId.toString() === user._id.toString();
};

/**
 * Backfill loan.adminId from the linked user's adminId when missing.
 */
export const backfillLoanAdminIds = async (LoanModel) => {
  const orphans = await LoanModel.find({
    $or: [{ adminId: null }, { adminId: { $exists: false } }],
    isDeleted: { $ne: true },
  }).select('_id user');

  if (!orphans.length) return 0;

  const userIds = [...new Set(orphans.map((l) => l.user?.toString()).filter(Boolean))];
  const users = await User.find({ _id: { $in: userIds } }).select('_id adminId');
  const adminByUser = new Map(users.map((u) => [u._id.toString(), u.adminId]));

  let updated = 0;
  await Promise.all(
    orphans.map(async (loan) => {
      const adminId = adminByUser.get(loan.user?.toString());
      if (adminId) {
        await LoanModel.updateOne({ _id: loan._id }, { $set: { adminId } });
        updated += 1;
      }
    })
  );
  return updated;
};
