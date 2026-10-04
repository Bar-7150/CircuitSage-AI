/**
 * CircuitSage AI — Authentication & Authorization Middleware
 *
 * Verifies Supabase Auth JWT access tokens independently in Express.
 * Strictly derives authenticated identity from the verified token,
 * never trusting a user ID supplied in the request body.
 * Enforces record ownership checks before reading or modifying private records.
 */

const { anonClient, createUserScopedClient, isConfigured } = require('../lib/supabaseClient');
const caseRepository = require('../db/caseRepository');
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

  // Handle mock tokens in test environment
  if (!isConfigured || !anonClient) {
    if (process.env.NODE_ENV === 'test') {
      if (token === 'valid-test-token') {
        req.user = { id: 'test-user-uuid-1234', email: 'test@circuitsage.local' };
        req.token = token;
        return next();
      } else if (token === 'other-user-token') {
        req.user = { id: 'other-user-uuid-5678', email: 'other@circuitsage.local' };
        req.token = token;
        return next();
      }
    }

    return res.status(401).json({
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Invalid, expired, or revoked Supabase access token.',
        details: [],
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

    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role
    };
    req.token = token;
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
    if (process.env.NODE_ENV === 'test') {
      if (token === 'valid-test-token') {
        req.user = { id: 'test-user-uuid-1234', email: 'test@circuitsage.local' };
        req.token = token;
      } else if (token === 'other-user-token') {
        req.user = { id: 'other-user-uuid-5678', email: 'other@circuitsage.local' };
        req.token = token;
      } else {
        req.user = null;
      }
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

/**
 * Middleware: Verifies record ownership before allowing read or mutation of private diagnostic cases.
 * Returns 404 if case does not exist, 403 if case belongs to another user.
 */
async function checkCaseOwnership(req, res, next) {
  const caseId = req.params.id;
  const userId = req.user ? req.user.id : null;

  try {
    const { exists, isOwner, caseItem } = await caseRepository.checkOwnership({
      id: caseId,
      userId,
      userClient: req.userClient
    });

    if (!exists) {
      return res.status(404).json({
        error: {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: `Diagnostic case ${caseId} not found.`,
          details: [{ field: 'id', issue: 'Resource not found in database.' }],
          requestId: req.id || 'unknown'
        }
      });
    }

    if (!isOwner) {
      return res.status(403).json({
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: 'Forbidden. You do not have permission to access or modify this diagnostic case.',
          details: [{ field: 'user_id', issue: 'Caller does not own this private record.' }],
          requestId: req.id || 'unknown'
        }
      });
    }

    req.caseItem = caseItem;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requireAuth,
  optionalAuth,
  checkCaseOwnership
};
