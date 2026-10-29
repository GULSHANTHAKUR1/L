/**
 * Catches 404 Not Found errors for any unmatched route and forwards to errorHandler.
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Centralized error-handling middleware for Express.
 */
export const errorHandler = (err, req, res, next) => {
  // If status is already 200, normalize to 500
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
