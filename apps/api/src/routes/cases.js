/**
 * CircuitSage AI — Diagnostic Cases Routes (/api/v1/diagnoses)
 */

const express = require('express');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { isConfigured } = require('../lib/supabaseClient');
const { ERROR_CODES, SUPPORTED_BOARDS } = require('@circuitsage/shared');

const router = express.Router();

/**
 * In-memory fallback session store for local/offline testing when Supabase is not configured
 */
const localSessionStore = new Map();

/**
 * GET /api/v1/diagnoses
 * Retrieves past diagnostic cases belonging to the authenticated user.
 */
router.get('/diagnoses', requireAuth, async (req, res, next) => {
  try {
    if (!isConfigured) {
      // In offline/test mode without live Supabase
      const userCases = Array.from(localSessionStore.values())
        .filter(c => c.user_id === req.user.id);
      return res.status(200).json({
        total: userCases.length,
        cases: userCases,
        mode: 'offline_local_store'
      });
    }

    // Execute query using user-scoped client so Supabase RLS policies are applied directly in Postgres
    const { data: cases, error } = await req.userClient
      .from('diagnostic_cases')
      .select('id, title, target_board, status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        error: {
          code: ERROR_CODES.DATABASE_ERROR,
          message: 'Failed to retrieve diagnostic cases from Supabase.',
          details: [error.message],
          requestId: req.id
        }
      });
    }

    return res.status(200).json({
      total: cases.length,
      cases: cases,
      mode: 'supabase_postgres_rls'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/diagnoses
 * Creates a new diagnostic case.
 * Derives user_id strictly from req.user (authenticated identity).
 */
router.post('/diagnoses', optionalAuth, async (req, res, next) => {
  try {
    const { target_board, symptom_description, title } = req.body;

    // Validate inputs
    const errors = [];
    if (!target_board || !SUPPORTED_BOARDS.includes(target_board)) {
      errors.push({
        field: 'target_board',
        issue: `Must be one of supported boards: ${SUPPORTED_BOARDS.join(', ')}`
      });
    }

    if (!symptom_description || typeof symptom_description !== 'string' || symptom_description.trim().length < 10) {
      errors.push({
        field: 'symptom_description',
        issue: 'Symptom description must be at least 10 characters long.'
      });
    }

    if (errors.length > 0) {
      return res.status(422).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'The request contains invalid input parameters.',
          details: errors,
          requestId: req.id
        }
      });
    }

    // Derive user ID strictly from authenticated token; NEVER trust request body user_id!
    const userId = req.user ? req.user.id : null;
    const caseTitle = title ? title.trim() : `${target_board} Circuit Diagnosis`;

    const newCase = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: caseTitle,
      target_board: target_board,
      symptom_description: symptom_description.trim(),
      status: 'ACTIVE',
      image_path: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!isConfigured || !req.userClient) {
      // Store in local session store
      localSessionStore.set(newCase.id, newCase);
      return res.status(201).json({
        case: newCase,
        mode: 'offline_local_store',
        message: 'Case created in offline session store.'
      });
    }

    // Insert into Supabase Postgres using user-scoped client
    const { data, error } = await req.userClient
      .from('diagnostic_cases')
      .insert({
        title: newCase.title,
        target_board: newCase.target_board,
        symptom_description: newCase.symptom_description,
        status: newCase.status,
        user_id: req.user.id // Enforced by RLS policy WITH CHECK (auth.uid() = user_id)
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: {
          code: ERROR_CODES.DATABASE_ERROR,
          message: 'Failed to persist case in Supabase.',
          details: [error.message],
          requestId: req.id
        }
      });
    }

    return res.status(201).json({
      case: data,
      mode: 'supabase_postgres_rls',
      message: 'Case created and protected under Supabase RLS.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/diagnoses/:id
 * Retrieves full case by ID and enforces user ownership.
 */
router.get('/diagnoses/:id', optionalAuth, async (req, res, next) => {
  try {
    const caseId = req.params.id;

    if (!isConfigured || !req.userClient) {
      const stored = localSessionStore.get(caseId);
      if (!stored) {
        return res.status(404).json({
          error: {
            code: ERROR_CODES.RESOURCE_NOT_FOUND,
            message: `Diagnostic case ${caseId} not found.`,
            details: [],
            requestId: req.id
          }
        });
      }

      // If stored case has user_id, check ownership
      if (stored.user_id && (!req.user || stored.user_id !== req.user.id)) {
        return res.status(403).json({
          error: {
            code: ERROR_CODES.FORBIDDEN,
            message: 'You do not have permission to access this diagnostic case.',
            details: [],
            requestId: req.id
          }
        });
      }

      return res.status(200).json({
        case: stored,
        mode: 'offline_local_store'
      });
    }

    // Query via Supabase RLS
    const { data: existingCase, error } = await req.userClient
      .from('diagnostic_cases')
      .select('*, case_messages(*), diagnostic_hypotheses(*), measurements(*)')
      .eq('id', caseId)
      .single();

    if (error || !existingCase) {
      return res.status(404).json({
        error: {
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          message: `Diagnostic case ${caseId} not found or inaccessible under RLS.`,
          details: error ? [error.message] : [],
          requestId: req.id
        }
      });
    }

    return res.status(200).json({
      case: existingCase,
      mode: 'supabase_postgres_rls'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
