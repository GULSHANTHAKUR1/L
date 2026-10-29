/**
 * Role-Based Access Control (RBAC) middleware factory.
 * Restricts access to one or more specified roles ('admin', 'doctor', 'patient').
 *
 * @param {...string} roles - List of allowed roles
 * @returns {Function} Express middleware function
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required role(s): [${roles.join(', ')}].`,
      });
    }

    next();
  };
};

export default authorizeRoles;
