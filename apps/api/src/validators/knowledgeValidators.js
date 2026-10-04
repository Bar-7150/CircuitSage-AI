/**
 * CircuitSage AI — Knowledge Search Validators
 */

function validateSearchKnowledge(req) {
  const errors = [];
  const { q, category, limit } = req.query;

  if (q && typeof q === 'string' && q.length > 100) {
    errors.push({
      field: 'q',
      issue: 'Search query cannot exceed 100 characters.'
    });
  }

  if (category && typeof category === 'string' && category.length > 50) {
    errors.push({
      field: 'category',
      issue: 'Category filter cannot exceed 50 characters.'
    });
  }

  if (limit !== undefined) {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      errors.push({
        field: 'limit',
        issue: 'limit must be an integer between 1 and 50.'
      });
    } else {
      req.query.limit = parsedLimit;
    }
  } else {
    req.query.limit = 20;
  }

  return { isValid: errors.length === 0, errors };
}

module.exports = {
  validateSearchKnowledge
};
