/**
 * CircuitSage AI — Centralized Error Handler Middleware
 */

const { ERROR_CODES } = require('@circuitsage/shared');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || ERROR_CODES.INTERNAL_SERVER_ERROR;
  const message = err.message || 'An unexpected internal server error occurred.';
  const details = err.details || [];

  // Log error for internal monitoring (avoid logging sensitive payloads)
  if (statusCode >= 500) {
    console.error(`[ERROR] [${req.id}] ${req.method} ${req.originalUrl}:`, err.message);
  }

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: message,
      details: details,
      requestId: req.id || 'unknown'
    }
  });
}

module.exports = errorHandler;
