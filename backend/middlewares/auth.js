import User from '../models/User.js';
import { sendError } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiResponse.js';
import { ROLES } from '../config/permissions.js';
import { verifyAccessToken } from '../utils/jwt.js';

const normalizeRole = (role) => {
  if (!role || typeof role !== 'string') return role;
  const cleaned = role.trim().toLowerCase().replace(/\s+/g, '_');
  if (cleaned === 'superadmin') return ROLES.SUPER_ADMIN;
  if (Object.values(ROLES).includes(cleaned)) return cleaned;
  return role;
};

/**
 * Protect routes - verify JWT access token
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return sendError(res, 401, 'Not authorized. Please login.');
  }

  try {
    // Must match generateAccessToken (JWT_ACCESS_SECRET || JWT_SECRET)
    const decoded = verifyAccessToken(token);
    const user = await User.findOne({
      _id: decoded.id,
      isDeleted: { $ne: true },
    }).select('-password -refreshToken');

    if (!user) {
      return sendError(res, 401, 'User not found. Please login again.');
    }

    if (!user.isActive || user.isSuspended) {
      return sendError(res, 403, 'Account is suspended or inactive.');
    }

    const normalizedRole = normalizeRole(user.role);
    if (normalizedRole && normalizedRole !== user.role) {
      await User.updateOne({ _id: user._id }, { $set: { role: normalizedRole } });
      user.role = normalizedRole;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token expired. Please refresh your token.');
    }
    return sendError(res, 401, 'Not authorized. Invalid token.');
  }
});

// Re-export authorize from permissions for backward compatibility
export { authorize, requirePermission, staffOnly } from './permissions.js';
