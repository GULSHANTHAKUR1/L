import jwt from 'jsonwebtoken';

/**
 * Generates a signed JWT payload containing only user ID and role,
 * and sets an HTTP-only secure cookie on the response.
 *
 * @param {Object} res - Express response object
 * @param {Object} user - User document containing _id and role
 * @returns {string} Signed JWT token string
 */
export const generateTokenAndSetCookie = (res, user) => {
  const jwtSecret = process.env.JWT_SECRET || 'default_heterohms_jwt_fallback_secret_32b';
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';

  // JWT payload strictly limited to user ID and role
  const payload = {
    id: user._id.toString(),
    role: user.role,
  };

  const token = jwt.sign(payload, jwtSecret, { expiresIn });

  const isProduction = process.env.NODE_ENV === 'production';

  // Set HTTP-only secure cookie
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax', // 'lax' prevents cross-port cookie drop in local dev
    maxAge: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
  });

  return token;
};

/**
 * Safely clears the access_token cookie from the client.
 *
 * @param {Object} res - Express response object
 */
export const clearTokenCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  });
};

export default { generateTokenAndSetCookie, clearTokenCookie };
