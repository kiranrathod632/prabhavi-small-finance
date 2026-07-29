import AuditLog from '../models/AuditLog.js';

/**
 * Create audit log entry
 */
export const createAuditLog = async ({
  user,
  action,
  entity,
  entityId,
  details,
  ipAddress,
  userAgent,
  status = 'success',
}) => {
  try {
    await AuditLog.create({
      user,
      action,
      entity,
      entityId,
      details,
      ipAddress,
      userAgent,
      status,
    });
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};
