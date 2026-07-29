import jwt from 'jsonwebtoken';

// .env uses JWT_ACCESS_SECRET; keep JWT_SECRET as fallback
const getAccessSecret = () =>
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

const getRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET;

const getAccessExpires = () =>
  process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRE || '15m';

const getRefreshExpires = () =>
  process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRE || '7d';

/**
 * Generate access token
 */
export const generateAccessToken = (userId, role) => {
  const secret = getAccessSecret();
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET (or JWT_SECRET) is not set in .env');
  }
  return jwt.sign({ id: userId, role }, secret, {
    expiresIn: getAccessExpires(),
  });
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId) => {
  const secret = getRefreshSecret();
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not set in .env');
  }
  return jwt.sign({ id: userId }, secret, {
    expiresIn: getRefreshExpires(),
  });
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, getAccessSecret());
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, getRefreshSecret());
};
