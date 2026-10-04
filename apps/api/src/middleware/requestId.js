/**
 * CircuitSage AI — Request ID Middleware
 */

const crypto = require('crypto');

function requestIdMiddleware(req, res, next) {
  // Use existing X-Request-Id header or generate a new UUID
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

module.exports = requestIdMiddleware;
