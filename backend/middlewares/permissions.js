import { hasPermission, isStaff } from '../config/permissions.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Restrict access to specific roles (backward compatible)
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    const expandedRoles = roles.flatMap((role) => {
      if (role === 'admin') {
        return ['admin', 'super_admin'];
      }
      return [role];
    });

    if (!expandedRoles.includes(req.user.role)) {
      return sendError(res, 403, `Role '${req.user.role}' is not authorized to access this resource.`);
    }
    next();
  };
};

/**
 * Permission-based authorization
 */
export const requirePermission = (...permissions) => {
  return (req, res, next) => {
    const allowed = permissions.some((p) => hasPermission(req.user.role, p));
    if (!allowed) {
      return sendError(res, 403, 'You do not have permission to perform this action.');
    }
    next();
  };
};

/**
 * Staff only middleware
 */
export const staffOnly = (req, res, next) => {
  if (!isStaff(req.user.role)) {
    return sendError(res, 403, 'Staff access required.');
  }
  next();
};
