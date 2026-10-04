/**
 * CircuitSage AI — Knowledge Controller
 */

const knowledgeService = require('../services/knowledgeService');

async function searchKnowledge(req, res, next) {
  try {
    const { q, category, limit } = req.query;
    const results = await knowledgeService.searchComponents({
      query: q,
      category,
      limit
    });

    return res.status(200).json({
      total: results.length,
      results
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchKnowledge
};
