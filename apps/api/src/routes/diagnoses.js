/**
 * CircuitSage AI — Diagnostic Routes (/api/v1/diagnoses)
 */

const express = require('express');
const diagnosisController = require('../controllers/diagnosisController');
const { requireAuth, optionalAuth, checkCaseOwnership } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { handleCircuitImageUpload } = require('../middleware/upload');
const {
  validateCreateDiagnosis,
  validateListDiagnoses,
  validateCaseIdParam,
  validateCreateMessage,
  validateSubmitMeasurement
} = require('../validators/diagnosisValidators');
const createRateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Rate limiter for diagnostic creation (prevents spamming inference)
const diagnosisCreationLimiter = createRateLimiter({ windowMs: 60000, max: 30 });

/**
 * POST /api/v1/diagnoses
 * Intake circuit symptoms, board, and optional image
 */
router.post(
  '/diagnoses',
  diagnosisCreationLimiter,
  optionalAuth,
  handleCircuitImageUpload('image'),
  validate(validateCreateDiagnosis),
  diagnosisController.createDiagnosis
);

/**
 * GET /api/v1/diagnoses
 * List user cases (Requires Bearer token)
 */
router.get(
  '/diagnoses',
  requireAuth,
  validate(validateListDiagnoses),
  diagnosisController.listDiagnoses
);

/**
 * GET /api/v1/diagnoses/:id
 * Retrieve specific case details, messages, hypotheses, and measurements
 */
router.get(
  '/diagnoses/:id',
  validate(validateCaseIdParam),
  optionalAuth,
  checkCaseOwnership,
  diagnosisController.getDiagnosisById
);

/**
 * POST /api/v1/diagnoses/:id/messages
 * Append user message or observation
 */
router.post(
  '/diagnoses/:id/messages',
  validate(validateCaseIdParam),
  optionalAuth,
  checkCaseOwnership,
  validate(validateCreateMessage),
  diagnosisController.createMessage
);

/**
 * POST /api/v1/diagnoses/:id/measurements
 * Submit multimeter measurement to test hypotheses
 */
router.post(
  '/diagnoses/:id/measurements',
  validate(validateCaseIdParam),
  optionalAuth,
  checkCaseOwnership,
  validate(validateSubmitMeasurement),
  diagnosisController.submitMeasurement
);

module.exports = router;
