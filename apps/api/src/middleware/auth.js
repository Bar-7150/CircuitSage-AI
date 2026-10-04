/**
 * CircuitSage AI — Authentication Middleware
 *
 * Verifies Supabase Auth JWT access tokens independently in Express.
 * Strictly derives authenticated identity from the verified token,
 * never trusting a user ID supplied in the request body.
 */

const { anonClient, createUserScopedClient, isConfigured } = require('../lib/supabaseClient');
const { ERROR_CODES } = require('@circuitsage/shared');

/**
 * Extracts Bearer token from the HTTP Authorization header.
 */
function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  return null;
}

/**
 * Middleware: Requires a valid Supabase Auth Bearer token.
 */
async function requireAuth(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required. Missing Bearer access token in Authorization header.',
        details: [],
        requestId: req.id || 'unknown'
      }
    });
  }

  // If live Supabase credentials are not configured, handle development/test mocking
  if (!isConfigured || !anonClient) {
    // In test environment or unconfigured local mode, reject mock unless in explicit test mock header
    if (process.env.NODE_ENV === 'test' && token === 'valid-test-token') {
      req.user = { id: 'test-user-uuid-1234', email: 'test@circuitsage.local' };
      req.token = token;
      return next();
    }

    return res.status(503).json({
      error: {
        code: ERROR_CODES.DATABASE_ERROR,
        message: 'Supabase authentication service is not configured with live credentials.',
        details: [{ hint: 'Check SUPABASE_URL and SUPABASE_ANON_KEY in apps/api/.env' }],
        requestId: req.id || 'unknown'
      }
    });
  }

  try {
    const { data, error } = await anonClient.auth.getUser(token);

    if (error || !data || !data.user) {
      return res.status(401).json({
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid, expired, or revoked Supabase access token.',
          details: error ? [error.message] : [],
          requestId: req.id || 'unknown'
        }
      });
    }

    // Securely derive identity strictly from the verified token
    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role
    };
    req.token = token;

    // Attach user-scoped Supabase client for RLS enforcement in downstream handlers
    req.userClient = createUserScopedClient(token);

    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Failed to verify authentication token.',
        details: [err.message],
        requestId: req.id || 'unknown'
      }
    });
  }
}

/**
 * Middleware: Optional authentication (attaches req.user if valid token present).
 */
async function optionalAuth(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  if (!isConfigured || !anonClient) {
    if (process.env.NODE_ENV === 'test' && token === 'valid-test-token') {
      req.user = { id: 'test-user-uuid-1234', email: 'test@circuitsage.local' };
    } else {
      req.user = null;
    }
    return next();
  }

  try {
    const { data, error } = await anonClient.auth.getUser(token);
    if (!error && data && data.user) {
      req.user = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role
      };
      req.token = token;
      req.userClient = createUserScopedClient(token);
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }

  next();
}

module.exports = {
  requireAuth,
  optionalAuth
};
