/**
 * CircuitSage AI — Rate Limiting Middleware
 * In-memory sliding window rate limiter for MVP endpoints to protect against abuse.
 */

const { ERROR_CODES } = require('@circuitsage/shared');

const requestCounts = new Map();

/**
 * Creates rate limiter middleware
 * @param {Object} options
 * @param {number} [options.windowMs=60000] - 1 minute window
 * @param {number} [options.max=60] - max requests per window
 */
function createRateLimiter({ windowMs = 60000, max = 60 } = {}) {
  // In test environment, allow high volume to prevent test throttling
  const effectiveMax = process.env.NODE_ENV === 'test' ? 1000 : max;

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();

    let clientRecord = requestCounts.get(ip);
    if (!clientRecord || now - clientRecord.windowStart > windowMs) {
      clientRecord = { windowStart: now, count: 1 };
      requestCounts.set(ip, clientRecord);
      return next();
    }

    clientRecord.count += 1;
    if (clientRecord.count > effectiveMax) {
      const retryAfterSeconds = Math.ceil((clientRecord.windowStart + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: {
          code: ERROR_CODES.RATE_LIMITED,
          message: 'Too many requests. Please slow down and try again later.',
          details: [{ field: 'rate_limit', issue: `Exceeded ${effectiveMax} requests per ${windowMs / 1000}s window. Retry after ${retryAfterSeconds}s.` }],
          requestId: req.id || 'unknown'
        }
      });
    }

    next();
  };
}

module.exports = createRateLimiter;
