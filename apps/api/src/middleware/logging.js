/**
 * CircuitSage AI — Privacy-Conscious Structured Logging Middleware
 * Logs HTTP requests, status codes, and latency with request IDs, omitting sensitive credentials.
 */

function loggingMiddleware(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const reqId = req.id || 'unknown';

    // Avoid logging in quiet test runs unless test fails
    if (process.env.NODE_ENV !== 'test') {
      const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
      console.log(`[${level}] [${new Date().toISOString()}] [${reqId}] ${req.method} ${req.originalUrl} -> ${statusCode} (${duration}ms)`);
    }
  });

  next();
}

module.exports = loggingMiddleware;
