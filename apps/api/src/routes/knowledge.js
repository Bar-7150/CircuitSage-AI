/**
 * CircuitSage AI — Knowledge Base Routes (/api/v1/knowledge)
 */

const express = require('express');
const knowledgeController = require('../controllers/knowledgeController');
const validate = require('../middleware/validate');
const { validateSearchKnowledge } = require('../validators/knowledgeValidators');
const createRateLimiter = require('../middleware/rateLimiter');

const router = express.Router();
const knowledgeLimiter = createRateLimiter({ windowMs: 60000, max: 120 });

/**
 * GET /api/v1/knowledge/search
 * Search curated electronics knowledge catalog
 */
router.get(
  '/knowledge/search',
  knowledgeLimiter,
  validate(validateSearchKnowledge),
  knowledgeController.searchKnowledge
);

module.exports = router;
