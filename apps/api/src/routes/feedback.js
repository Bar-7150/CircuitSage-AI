/**
 * CircuitSage AI — Feedback Routes (/api/v1/feedback)
 */

const express = require('express');
const feedbackController = require('../controllers/feedbackController');
const { optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateSubmitFeedback } = require('../validators/feedbackValidators');
const createRateLimiter = require('../middleware/rateLimiter');

const router = express.Router();
const feedbackLimiter = createRateLimiter({ windowMs: 60000, max: 30 });

/**
 * POST /api/v1/feedback
 * Submit usability ratings and verification feedback
 */
router.post(
  '/feedback',
  feedbackLimiter,
  optionalAuth,
  validate(validateSubmitFeedback),
  feedbackController.submitFeedback
);

module.exports = router;
