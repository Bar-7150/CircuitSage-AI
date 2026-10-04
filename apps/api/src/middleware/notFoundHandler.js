/**
 * CircuitSage AI — 404 Route Not Found Handler
 */

const { ERROR_CODES } = require('@circuitsage/shared');

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
      message: `Cannot ${req.method} ${req.originalUrl} — Route does not exist.`,
      details: [],
      requestId: req.id || 'unknown'
    }
  });
}

module.exports = notFoundHandler;
