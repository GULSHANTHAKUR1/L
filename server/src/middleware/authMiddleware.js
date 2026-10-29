import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect middleware: Verifies JWT token from HTTP-only cookie or Bearer Authorization header.
 * Attaches the authenticated user to `req.user` (excluding passwordHash).
 */
export const protect = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }
    // 2. Check Bearer Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized: Access token missing. Please log in.',
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'default_heterohms_jwt_fallback_secret_32b';
    const decoded = jwt.verify(token, jwtSecret);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized: Invalid token payload.',
      });
    }

    // Fetch user and ensure passwordHash is never attached
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized: User account no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account deactivated: Please contact hospital administration.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired: Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized: Token verification failed.',
    });
  }
};

export default protect;
